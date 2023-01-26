import { MetadataUtils } from '../../../core/model/element-metadata-utils'
import * as EP from '../../../core/shared/element-path'
import { emptyComments, jsxAttributeValue } from '../../../core/shared/element-template'
import { ElementPath, PropertyPath } from '../../../core/shared/project-file-types'
import * as PP from '../../../core/shared/property-path'
import { EditorState } from '../../editor/store/editor-state'
import { applyValuesAtPath } from './adjust-number-command'
import { BaseCommand, CommandFunction, WhenToRun } from './commands'

export interface AddContainLayoutIfNeeded extends BaseCommand {
  type: 'ADD_CONTAIN_LAYOUT_IF_NEEDED'
  element: ElementPath
}

export function addContainLayoutIfNeeded(
  whenToRun: WhenToRun,
  element: ElementPath,
): AddContainLayoutIfNeeded {
  return {
    type: 'ADD_CONTAIN_LAYOUT_IF_NEEDED',
    whenToRun: whenToRun,
    element: element,
  }
}

export const runAddContainLayoutIfNeeded: CommandFunction<AddContainLayoutIfNeeded> = (
  editorState: EditorState,
  command: AddContainLayoutIfNeeded,
) => {
  const elementMetadata = MetadataUtils.findElementByElementPath(
    editorState.jsxMetadata,
    command.element,
  )
  const isNotNeeded = elementMetadata == null || MetadataUtils.isPositionStatic(elementMetadata)

  if (isNotNeeded) {
    return {
      editorStatePatches: [],
      commandDescription: `Not adding style.contain: 'layout' to ${EP.toUid(command.element)}`,
    }
  } else {
    // Apply the update to the properties.
    const { editorStatePatch } = applyValuesAtPath(editorState, command.element, [
      { path: PP.create('style', 'contain'), value: jsxAttributeValue('layout', emptyComments) },
    ])

    return {
      editorStatePatches: [editorStatePatch],
      commandDescription: `Adding style.contain: 'layout' to ${EP.toUid(command.element)}`,
    }
  }
}
