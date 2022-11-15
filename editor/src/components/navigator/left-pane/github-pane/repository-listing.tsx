import React from 'react'
import TimeAgo from 'react-timeago'
import { projectDependenciesSelector } from '../../../../core/shared/dependencies'
import { notice } from '../../../../components/common/notice'
import { showToast } from '../../../../components/editor/actions/action-creators'
import {
  GithubRepo,
  githubRepoEquals,
  isGithubLoadingBranch,
} from '../../../../components/editor/store/editor-state'
import {
  updateProjectWithBranchContent,
  getUsersPublicGithubRepositories,
  parseGithubProjectString,
  RepositoryEntry,
} from '../../../../core/shared/github'
import { useColorTheme, Button, StringInput } from '../../../../uuiui'
import { useEditorState } from '../../../editor/store/store-hook'
import { UIGridRow } from '../../../inspector/widgets/ui-grid-row'
import { GithubSpinner } from './github-spinner'
import { RefreshIcon } from './refresh-icon'

interface RepositoryRowProps extends RepositoryEntry {
  importPermitted: boolean
}

const RepositoryRow = (props: RepositoryRowProps) => {
  const colorTheme = useColorTheme()

  const dispatch = useEditorState((store) => store.dispatch, 'RepositoryRow dispatch')

  const projectID = useEditorState((store) => store.editor.id, 'RepositoryRow projectID')

  const githubWorking = useEditorState(
    (store) => store.editor.githubOperations.length > 0,
    'RepositoryRow githubWorking',
  )

  const [importing, setImporting] = React.useState(false)

  const importingThisBranch = useEditorState((store) => {
    if (props.defaultBranch == null) {
      return false
    } else {
      return isGithubLoadingBranch(
        store.editor.githubOperations,
        props.defaultBranch,
        store.editor.githubSettings.targetRepository,
      )
    }
  }, 'RepositoryRow importingThisBranch')

  const [previousImportingThisBranch, setPreviousImportingThisBranch] =
    React.useState(importingThisBranch)

  // Should reset the spinner which is tied to a specific branch and repository.
  if (importingThisBranch !== previousImportingThisBranch) {
    setPreviousImportingThisBranch(importingThisBranch)
    if (!importingThisBranch) {
      setImporting(false)
    }
  }

  const currentRepo = useEditorState(
    (store) => store.editor.githubSettings.targetRepository,
    'Current Github repository',
  )
  const builtInDependencies = useEditorState(
    (store) => store.builtInDependencies,
    'Built-in dependencies',
  )
  const currentDependencies = useEditorState(projectDependenciesSelector, 'Project dependencies')

  const importRepository = React.useCallback(() => {
    const parsedTargetRepository = parseGithubProjectString(props.fullName)
    if (parsedTargetRepository == null || props.defaultBranch == null) {
      dispatch(
        [
          showToast(
            notice(
              `Error when attempting to import a repository with repo: ${props.fullName}`,
              'ERROR',
            ),
          ),
        ],
        'everyone',
      )
    } else {
      const isAnotherRepo = !githubRepoEquals(parsedTargetRepository, currentRepo)
      void updateProjectWithBranchContent(
        dispatch,
        parsedTargetRepository,
        props.defaultBranch,
        isAnotherRepo,
        currentDependencies,
        builtInDependencies,
      )
      setImporting(true)
    }
  }, [
    dispatch,
    props.fullName,
    props.defaultBranch,
    currentRepo,
    builtInDependencies,
    currentDependencies,
  ])

  return (
    <div
      style={{
        minHeight: 40,
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        paddingLeft: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingTop: 8,
        borderBottom: '1px solid #ccc',
      }}
    >
      <div
        style={{
          borderRadius: '50%',
          width: 20,
          height: 20,
          border: '1px solid #ccc',
          backgroundImage: `url(${props.avatarUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div style={{ flexGrow: 1 }}>
        <span style={{ fontWeight: 600, textOverflow: 'ellipsis' }}>
          {props.name ?? props.fullName}
        </span>{' '}
        <br />
        <span style={{ opacity: 0.5 }}>
          {props.private ? 'private' : 'public'}
          {props.updatedAt == null ? null : (
            <>
              {' · '}
              <TimeAgo date={props.updatedAt} />
            </>
          )}
        </span>
      </div>
      <Button
        style={{
          fontSize: 11,
          background: colorTheme.buttonBackground.value,
          boxShadow: 'none',
          border: 'none',
          height: 22,
          color:
            props.importPermitted && !githubWorking
              ? colorTheme.inlineButtonColor.value
              : colorTheme.inlineButtonColorDisabled.value,
          borderRadius: 2,
          cursor: 'pointer',
          minWidth: '44px',
        }}
        disabled={!props.importPermitted || githubWorking}
        onMouseUp={importRepository}
      >
        {importing ? <GithubSpinner /> : 'Import'}
      </Button>
    </div>
  )
}

interface RepositoryListingProps {
  githubAuthenticated: boolean
  storedTargetGithubRepo: GithubRepo | null
}

export const RepositoryListing = React.memo(
  ({ githubAuthenticated, storedTargetGithubRepo }: RepositoryListingProps) => {
    const storedTargetGithubRepoAsText = React.useMemo(() => {
      if (storedTargetGithubRepo == null) {
        return undefined
      } else {
        return `${storedTargetGithubRepo.owner}/${storedTargetGithubRepo.repository}`
      }
    }, [storedTargetGithubRepo])
    const [previousStoredTarget, setPreviousStoredTarget] = React.useState<string | undefined>(
      undefined,
    )
    const [targetRepository, setTargetRepository] = React.useState<string | undefined>(
      storedTargetGithubRepoAsText,
    )
    if (storedTargetGithubRepoAsText !== previousStoredTarget) {
      // Since the storedTargetGithubRepoAsText value changed, update targetRepository.
      setTargetRepository(storedTargetGithubRepoAsText)
      setPreviousStoredTarget(storedTargetGithubRepoAsText)
    }

    const onInputChangeTargetRepository = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setTargetRepository(event.currentTarget.value)
      },
      [setTargetRepository],
    )

    const usersRepositories = useEditorState(
      (store) => store.editor.githubData.publicRepositories,
      'Github repositories',
    )

    const filteredRepositories = React.useMemo(() => {
      let filteredResult: Array<RepositoryRowProps> = []
      for (const repository of usersRepositories) {
        // Only include a repository if the user can push to it.
        if (repository.permissions.push) {
          filteredResult.push({
            ...repository,
            importPermitted: true,
          })
        }
      }
      if (targetRepository != null) {
        filteredResult = filteredResult.filter((repository) => {
          return (
            repository.fullName.includes(targetRepository) ||
            repository.name?.includes(targetRepository)
          )
        })
      }
      return filteredResult
    }, [usersRepositories, targetRepository])

    const filteredRepositoriesWithSpecialCases = React.useMemo(() => {
      if (filteredRepositories == null) {
        return null
      } else {
        const parsedRepo =
          targetRepository == null ? null : parseGithubProjectString(targetRepository)
        if (parsedRepo == null) {
          return filteredRepositories
        } else {
          const ownerRepo = `${parsedRepo.owner}/${parsedRepo.repository}`
          const alreadyIncludesEntry =
            filteredRepositories?.some((repo) => repo.fullName === ownerRepo) ?? false
          if (alreadyIncludesEntry) {
            return filteredRepositories
          } else {
            const additionalEntry: RepositoryRowProps = {
              fullName: parsedRepo.repository,
              avatarUrl: null,
              private: true,
              description: null,
              name: null,
              updatedAt: null,
              defaultBranch: null,
              importPermitted: false,
              permissions: {
                admin: false,
                push: false,
                pull: false,
              },
            }
            return [...filteredRepositories, additionalEntry]
          }
        }
      }
    }, [filteredRepositories, targetRepository])

    const githubOperations = useEditorState(
      (store) => store.editor.githubOperations,
      'Github operations',
    )
    const githubWorking = React.useMemo(() => githubOperations.length > 0, [githubOperations])
    const isLoadingRepositories = React.useMemo(
      () => githubOperations.some((op) => op.name === 'loadRepositories'),
      [githubOperations],
    )
    const dispatch = useEditorState((store) => store.dispatch, 'dispatch')

    const refreshRepos = React.useCallback(() => {
      void getUsersPublicGithubRepositories(dispatch)
    }, [dispatch])

    if (!githubAuthenticated) {
      return null
    }

    return (
      <>
        <UIGridRow padded variant={'<----------1fr---------><-auto->'}>
          <StringInput
            placeholder={
              filteredRepositoriesWithSpecialCases == null
                ? 'Loading repositories...'
                : 'owner/repository'
            }
            onChange={onInputChangeTargetRepository}
            list={'repositories-list'}
            id={'repositories-input'}
            testId={'repositories-input'}
            name={'repositories-input'}
            value={targetRepository}
          />
          <Button
            spotlight
            highlight
            style={{ padding: '0 6px' }}
            disabled={githubWorking}
            onMouseDown={refreshRepos}
          >
            {isLoadingRepositories ? <GithubSpinner /> : <RefreshIcon />}
          </Button>
        </UIGridRow>

        <UIGridRow padded variant='<-------------1fr------------->'>
          <div
            style={{
              border: '1px solid #ccc',
              height: 220,
              overflowY: 'scroll',
            }}
          >
            {filteredRepositoriesWithSpecialCases == null ? (
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ margin: 'auto', position: 'relative' }}>
                  <GithubSpinner />
                </div>
              </div>
            ) : (
              filteredRepositoriesWithSpecialCases.map((repository, index) => {
                return <RepositoryRow key={`repo-${index}`} {...repository} />
              })
            )}
          </div>
        </UIGridRow>
        <UIGridRow padded variant='<-------------1fr------------->'>
          <a href='https://github.com/new' target='_blank' rel='noopener noreferrer'>
            Create new repository on Github.
          </a>
        </UIGridRow>
      </>
    )
  },
)
