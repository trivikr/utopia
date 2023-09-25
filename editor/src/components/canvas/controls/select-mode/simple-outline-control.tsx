import React from 'react'
import { MetadataUtils } from '../../../../core/model/element-metadata-utils'
import * as EP from '../../../../core/shared/element-path'
import type { ElementInstanceMetadataMap } from '../../../../core/shared/element-template'
import type { ElementPath } from '../../../../core/shared/project-file-types'
import { useColorTheme } from '../../../../uuiui'
import { Substores, useEditorState } from '../../../editor/store/store-hook'
import { useBoundingBox } from '../bounding-box-hooks'
import { CanvasOffsetWrapper } from '../canvas-offset-wrapper'
import { isZeroSizedElement } from '../outline-utils'
import type { ThemeObject } from '../../../../uuiui/styles/theme/theme-helpers'

interface MultiSelectOutlineControlProps {
  localSelectedElements: Array<ElementPath>
}

export const MultiSelectOutlineControl = React.memo<MultiSelectOutlineControlProps>((props) => {
  const hiddenInstances = useEditorState(
    Substores.restOfEditor,
    (store) => store.editor.hiddenInstances,
    'MultiSelectOutlineControl hiddenInstances',
  )
  const localSelectedElements = props.localSelectedElements.filter(
    (sv) => !hiddenInstances.includes(sv) && !EP.isStoryboardPath(sv),
  )
  return (
    <CanvasOffsetWrapper>
      {[
        <OutlineControl
          testId={`multiselect-outline`}
          key='multiselect-outline'
          targets={localSelectedElements}
          color='multiselect-bounds'
          outlineStyle='solid'
        />,
        ...localSelectedElements.map((path) => {
          const outlineId = `multiselect-element-outline-${EP.toString(path)}`
          return (
            <OutlineControl
              testId={outlineId}
              key={outlineId}
              targets={[path]}
              color='primary'
              outlineStyle='solid'
            />
          )
        }),
      ]}
    </CanvasOffsetWrapper>
  )
})

interface OutlineControlProps {
  testId: string
  targets: ReadonlyArray<ElementPath>
  color: 'primary' | 'multiselect-bounds'
  outlineStyle: 'solid' | 'dotted'
}

export const OutlineControl = React.memo<OutlineControlProps>((props) => {
  const colorTheme = useColorTheme()
  const targets = props.targets
  const scale = useEditorState(
    Substores.canvas,
    (store) => store.editor.canvas.scale,
    'OutlineControl scale',
  )

  const outlineRef = useBoundingBox(targets, (ref, boundingBox, canvasScale) => {
    if (isZeroSizedElement(boundingBox)) {
      ref.current.style.display = 'none'
    } else {
      ref.current.style.display = 'block'
      ref.current.style.left = `${boundingBox.x - 0.5 / canvasScale}px`
      ref.current.style.top = `${boundingBox.y - 0.5 / canvasScale}px`
      ref.current.style.width = `${boundingBox.width + 1 / canvasScale}px`
      ref.current.style.height = `${boundingBox.height + 1 / canvasScale}px`
    }
  })

  if (targets.length > 0) {
    return (
      <div
        data-testid={props.testId}
        ref={outlineRef}
        className='role-outline'
        style={{
          position: 'absolute',
          borderColor: colorTheme.primary.value,
          borderWidth: `${1 / scale}px`,
          borderStyle: props.outlineStyle,
          pointerEvents: 'none',
        }}
      />
    )
  }
  return null
})

export function getSelectionColor(
  path: ElementPath,
  metadata: ElementInstanceMetadataMap,
  focusedElementPath: ElementPath | null,
  autoFocusedPaths: Array<ElementPath>,
  colorTheme: ThemeObject,
): string {
  if (
    EP.isInsideFocusedComponent(path, autoFocusedPaths) &&
    !MetadataUtils.isContainingComponentRemixSceneOrOutlet(metadata, path)
  ) {
    if (MetadataUtils.isAutomaticOrManuallyFocusableComponent(path, metadata, autoFocusedPaths)) {
      return colorTheme.canvasSelectionFocusableChild.value
    } else {
      return colorTheme.canvasSelectionNotFocusableChild.value
    }
  } else if (EP.isFocused(focusedElementPath, path)) {
    return colorTheme.canvasSelectionIsolatedComponent.value
  } else if (
    MetadataUtils.isAutomaticOrManuallyFocusableComponent(path, metadata, autoFocusedPaths)
  ) {
    return colorTheme.canvasSelectionFocusable.value
  } else {
    return colorTheme.canvasSelectionNotFocusable.value
  }
}
