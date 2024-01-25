import React from 'react'
import type { User } from '@liveblocks/client'
import { LiveObject, type ThreadData } from '@liveblocks/client'
import type {
  ConnectionInfo,
  Presence,
  SceneThreadMetadata,
  ThreadMetadata,
  UserMeta,
} from '../../../liveblocks.config'
import {
  isSceneThreadMetadata,
  useEditThreadMetadata,
  useMutation,
  useSelf,
  useStorage,
  useThreads,
} from '../../../liveblocks.config'
import { Substores, useEditorState } from '../../components/editor/store/store-hook'
import { normalizeMultiplayerName } from '../shared/multiplayer'
import { isLoggedIn } from '../../common/user'
import type { CommentId, SceneCommentLocation } from '../../components/editor/editor-modes'
import { assertNever } from '../shared/utils'
import type {
  CanvasPoint,
  CanvasRectangle,
  LocalPoint,
  MaybeInfinityCanvasRectangle,
} from '../shared/math-utils'
import {
  canvasPoint,
  getCanvasPointWithCanvasOffset,
  isNotNullFiniteRectangle,
  localPoint,
  nullIfInfinity,
} from '../shared/math-utils'
import { MetadataUtils } from '../model/element-metadata-utils'
import { getIdOfScene } from '../../components/canvas/controls/comment-mode/comment-mode-hooks'
import type { ElementPath } from '../shared/project-file-types'
import { type ElementInstanceMetadata } from '../shared/element-template'
import * as EP from '../shared/element-path'
import { getCurrentTheme } from '../../components/editor/store/editor-state'
import { useMyUserId } from '../shared/multiplayer-hooks'
import { usePermissions } from '../../components/editor/store/permissions'
import { isFeatureEnabled } from '../../utils/feature-switches'
import { modify, toFirst } from '../shared/optics/optic-utilities'
import { filtered, fromObjectField, traverseArray } from '../shared/optics/optic-creators'
import { foldEither } from '../shared/either'

export function useCanvasCommentThreadAndLocation(comment: CommentId): {
  location: CanvasPoint | null
  thread: ThreadData<ThreadMetadata> | null
} {
  const threads = useActiveThreads()

  const thread = React.useMemo(() => {
    switch (comment.type) {
      case 'new':
        return null
      case 'existing':
        return threads.find((t) => t.id === comment.threadId) ?? null
      default:
        assertNever(comment)
    }
  }, [threads, comment])

  const scenes = useScenes()

  const location = React.useMemo(() => {
    switch (comment.type) {
      case 'new':
        switch (comment.location.type) {
          case 'canvas':
            return comment.location.position
          case 'scene':
            let { sceneId } = comment.location as SceneCommentLocation
            const scene = scenes.find((s) => {
              return getIdOfScene(s) === sceneId || EP.toUid(s.elementPath) === sceneId
            })

            if (scene == null || !isNotNullFiniteRectangle(scene.globalFrame)) {
              return comment.location.position
            }
            return getCanvasPointWithCanvasOffset(scene.globalFrame, comment.location.offset)
          default:
            assertNever(comment.location)
        }
        break
      case 'existing':
        if (thread == null) {
          return null
        }

        const { metadata } = thread
        if (!isSceneThreadMetadata(metadata)) {
          return canvasPoint(metadata)
        }
        const scene = scenes.find((s) => getIdOfScene(s) === metadata.sceneId)

        if (scene == null) {
          return canvasPoint(thread.metadata)
        }
        if (!isNotNullFiniteRectangle(scene.globalFrame)) {
          return canvasPoint(metadata)
        }
        return getCanvasPointWithCanvasOffset(scene.globalFrame, positionInScene(metadata))

      default:
        assertNever(comment)
    }
  }, [comment, thread, scenes])

  return { location, thread }
}

function placeholderUserMeta(user: User<Presence, UserMeta>): UserMeta {
  return {
    id: user.id,
    name: null,
    avatar: null,
  }
}

interface Collaborators {
  [key: string]: UserMeta
}

export function getCollaborator(
  collabs: Collaborators,
  source: User<Presence, UserMeta>,
): UserMeta {
  return getCollaboratorById(collabs, source.id) ?? placeholderUserMeta(source)
}

export function getCollaboratorById(collabs: Collaborators, id: string): UserMeta | null {
  return collabs[id] ?? null
}

interface Connections {
  [key: string]: Array<ConnectionInfo>
}

export function getConnectionById(
  connections: Connections,
  userId: string,
  connectionId: number,
): ConnectionInfo | null {
  const connectionOptic = fromObjectField<Array<ConnectionInfo>, Connections>(userId)
    .compose(traverseArray())
    .compose(filtered((connection) => connection.id === connectionId))
  return foldEither(
    () => null,
    (result) => result,
    toFirst(connectionOptic, connections),
  )
}

export function setConnectionById(
  allConnections: Connections,
  userId: string,
  connectionId: number,
  updatedConnection: ConnectionInfo,
): void {
  const connectionsOptic = fromObjectField<Array<ConnectionInfo>, Connections>(userId)
  modify(
    connectionsOptic,
    (connections) => {
      const alreadyExisting = connections.some((connection) => connection.id === connectionId)
      if (alreadyExisting) {
        return connections.map((connection) => {
          if (connection.id === connectionId) {
            return updatedConnection
          } else {
            return connection
          }
        })
      } else {
        return [...connections, updatedConnection]
      }
    },
    allConnections,
  )
}

export function useConnections(): Connections {
  return useStorage((store) => store.connections)
}

export function useGetConnection(userId: string, connectionId: number): ConnectionInfo | null {
  const connections = useConnections()
  return getConnectionById(connections, userId, connectionId)
}

export function useGetMyConnection(): ConnectionInfo | null {
  const me = useSelf()
  return useGetConnection(me.id, me.connectionId)
}

export function useMyUserAndPresence(): {
  presence: User<Presence, UserMeta>
  user: UserMeta
} {
  const me = useSelf()
  const collabs = useStorage((store) => store.collaborators)
  const myUser: UserMeta | null = getCollaborator(collabs, me)
  return {
    presence: me,
    user: myUser ?? placeholderUserMeta(me),
  }
}

export function useAddMyselfToCollaborators() {
  const loginState = useEditorState(
    Substores.userState,
    (store) => store.userState.loginState,
    'useAddMyselfToCollaborators loginState',
  )

  const addMyselfToCollaborators = useMutation(
    ({ storage, self }) => {
      if (!isLoggedIn(loginState)) {
        return
      }
      const collaborators = storage.get('collaborators')

      if (collaborators.get(self.id) == null) {
        collaborators.set(
          self.id,
          new LiveObject({
            id: loginState.user.userId,
            name: normalizeMultiplayerName(loginState.user.name ?? null),
            avatar: loginState.user.picture ?? null,
          }),
        )
      }
    },
    [loginState],
  )

  const collabs = useStorage((store) => store.collaborators)

  React.useEffect(() => {
    if (collabs != null) {
      addMyselfToCollaborators()
    }
  }, [addMyselfToCollaborators, collabs])
}

export function useCollaborators() {
  return useStorage((store) => store.collaborators)
}

export function useScenesWithId(): Array<ElementInstanceMetadata> {
  return useEditorState(
    Substores.metadata,
    (store) => {
      const scenes = MetadataUtils.getScenesMetadata(store.editor.jsxMetadata)
      return scenes.filter((s) => getIdOfScene(s) != null)
    },
    'useScenesWithId scenes',
  )
}

export function useScenes(): Array<ElementInstanceMetadata> {
  return useEditorState(
    Substores.metadata,
    (store) => MetadataUtils.getScenesMetadata(store.editor.jsxMetadata),
    'useScenesWithId scenes',
  )
}

export function useCanvasLocationOfThread(thread: ThreadData<ThreadMetadata>): {
  location: CanvasPoint
  scene: ElementPath | null
} {
  const scenes = useScenesWithId()

  const { metadata } = thread
  if (!isSceneThreadMetadata(metadata)) {
    return { location: canvasPoint(metadata), scene: null }
  }
  const scene = scenes.find((s) => getIdOfScene(s) === metadata.sceneId)

  if (scene == null || !isNotNullFiniteRectangle(scene.globalFrame)) {
    return { location: canvasPoint(metadata), scene: null }
  }
  return {
    location: getCanvasPointWithCanvasOffset(scene.globalFrame, positionInScene(metadata)),
    scene: scene.elementPath,
  }
}

export function useResolveThread() {
  const editThreadMetadata = useEditThreadMetadata()

  const resolveThread = React.useCallback(
    (thread: ThreadData<ThreadMetadata>) => {
      editThreadMetadata({ threadId: thread.id, metadata: { resolved: !thread.metadata.resolved } })
    },
    [editThreadMetadata],
  )

  return resolveThread
}

export function useActiveThreads() {
  const { threads } = useThreads()
  const showResolved = useEditorState(
    Substores.restOfEditor,
    (store) => store.editor.commentFilterMode === 'all-including-resolved',
    'useActiveThreads showResolved',
  )
  if (!showResolved) {
    return threads.filter((t) => !t.metadata.resolved)
  }
  return threads
}

export function useResolvedThreads() {
  return useThreads({
    query: {
      metadata: {
        resolved: true,
      },
    },
  })
}

export function useUnresolvedThreads() {
  return useThreads({
    query: {
      metadata: {
        resolved: false,
      },
    },
  })
}

export function useReadThreads() {
  const threads = useThreads()
  const myUserId = useMyUserId()
  const threadReadStatuses = useStorage((store) => store.userReadStatusesByThread)

  const filteredThreads = threads.threads.filter((thread) => {
    if (myUserId == null) {
      return false
    }
    if (thread == null) {
      return false
    }
    if (threadReadStatuses[thread.id] == null) {
      return false
    }
    return threadReadStatuses[thread.id][myUserId] === true
  })

  return {
    ...threads,
    threads: filteredThreads,
  }
}

export function useSetThreadReadStatusOnMount(thread: ThreadData<ThreadMetadata> | null) {
  const setThreadReadStatus = useSetThreadReadStatus()

  React.useEffect(() => {
    if (thread == null) {
      return
    }

    setThreadReadStatus(thread.id, 'read')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only run it once on mount, because opening the popup means reading the thread, no dependencies added
}

export function useMyThreadReadStatus(thread: ThreadData<ThreadMetadata> | null): ThreadReadStatus {
  const myUserId = useMyUserId()
  return useStorage((store) => {
    if (myUserId == null) {
      return 'unread'
    }
    if (thread == null) {
      return 'unread'
    }
    const statusesForThread = store.userReadStatusesByThread[thread.id]
    if (statusesForThread == null) {
      return 'unread'
    }
    return statusesForThread[myUserId] === true ? 'read' : 'unread'
  })
}

export type ThreadReadStatus = 'read' | 'unread'

export function useSetThreadReadStatus() {
  return useMutation(({ storage, self }, threadId: string, status: ThreadReadStatus) => {
    const statusesForThread = storage.get('userReadStatusesByThread')
    if (statusesForThread == null) {
      return
    }
    const userReadStatuses = statusesForThread.get(threadId)
    if (userReadStatuses == null) {
      return
    }
    const myStatus = userReadStatuses.get(self.id)
    switch (status) {
      case 'read':
        if (myStatus === true) {
          return
        }
        userReadStatuses.set(self.id, true)
        break
      case 'unread':
        if (myStatus == null || myStatus === false) {
          return
        }
        userReadStatuses.delete(self.id)
        break
    }
  }, [])
}

export function useCreateNewThreadReadStatus() {
  return useMutation(({ storage, self }, threadId: string, status: ThreadReadStatus) => {
    const userReadStatuses = new LiveObject(status === 'read' ? { [self.id]: true } : {})
    const statusesForThread = storage.get('userReadStatusesByThread')
    if (statusesForThread != null) {
      statusesForThread.set(threadId, userReadStatuses)
    }
  }, [])
}

export function useDeleteThreadReadStatus() {
  return useMutation(({ storage }, threadId: string) => {
    const statusesForThread = storage.get('userReadStatusesByThread')
    if (statusesForThread != null) {
      statusesForThread.delete(threadId)
    }
  }, [])
}

export function useDataThemeAttributeOnBody() {
  const theme = useEditorState(
    Substores.userState,
    (store) => getCurrentTheme(store.userState),
    'useDataThemeAttributeOnBody theme',
  )
  React.useEffect(() => {
    document.body.setAttribute('data-theme', theme)
  }, [theme])
}

export function useCanComment() {
  const canComment = usePermissions().comment

  return isFeatureEnabled('Multiplayer') && canComment
}

export function getThreadLocationOnCanvas(
  thread: ThreadData<ThreadMetadata>,
  startingSceneGlobalFrame: MaybeInfinityCanvasRectangle | null,
): CanvasPoint {
  const globalFrame = nullIfInfinity(startingSceneGlobalFrame)
  if (!isSceneThreadMetadata(thread.metadata) || globalFrame == null) {
    return canvasPoint(thread.metadata)
  }

  return canvasPositionOfThread(globalFrame, positionInScene(thread.metadata))
}

function canvasPositionOfThread(
  sceneGlobalFrame: CanvasRectangle,
  locationInScene: LocalPoint,
): CanvasPoint {
  return canvasPoint({
    x: sceneGlobalFrame.x + locationInScene.x,
    y: sceneGlobalFrame.y + locationInScene.y,
  })
}

export function positionInScene(metadata: SceneThreadMetadata): LocalPoint {
  return localPoint({ x: metadata.sceneX, y: metadata.sceneY })
}
