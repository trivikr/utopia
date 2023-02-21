import {
  EditorRenderResult,
  getPrintedUiJsCode,
  makeTestProjectCodeWithSnippet,
  renderTestEditorWithCode,
} from '../../ui-jsx.test-utils'
import { CanvasControlsContainerID } from '../../controls/new-canvas-controls'
import { cmdModifier, emptyModifiers, Modifiers } from '../../../../utils/modifiers'
import {
  mouseClickAtPoint,
  mouseDownAtPoint,
  mouseDragFromPointWithDelta,
  mouseMoveToPoint,
} from '../../event-helpers.test-utils'
import {
  isInfinityRectangle,
  rectangleDifference,
  windowPoint,
  WindowPoint,
} from '../../../../core/shared/math-utils'
import * as EP from '../../../../core/shared/element-path'
import { MetadataUtils } from '../../../../core/model/element-metadata-utils'
import { assert } from 'chai'
import { wait } from '../../../../core/model/performance-scripts'

const TestProjectBlockElements = (additionalContainerStyle: string = '') => `
<div style={{ width: '100%', height: '100%', position: 'absolute', ${additionalContainerStyle} }} data-uid='container'>
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#CA1E4C80',
    }}
    data-uid='aaa'
    data-testid='aaa'
  />
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#297374',
    }}
    data-uid='bbb'
    data-testid='bbb'
  />
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#292E74',
    }}
    data-uid='ccc'
    data-testid='ccc'
  />
</div>
`

const TestProjectCCCDraggedToSecond = `
<div style={{ width: '100%', height: '100%', position: 'absolute' }} data-uid='container'>
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#CA1E4C80',
    }}
    data-uid='aaa'
    data-testid='aaa'
  />
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#292E74',
    }}
    data-uid='ccc'
    data-testid='ccc'
  />
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#297374',
    }}
    data-uid='bbb'
    data-testid='bbb'
  />
</div>
`

const TestProjectBlockElementsWithFragment = (additionalContainerStyle: string = '') => `
<div style={{ width: '100%', height: '100%', position: 'absolute', ${additionalContainerStyle} }} data-uid='container'>
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#CA1E4C80',
    }}
    data-uid='aaa'
    data-testid='aaa'
  />
  <React.Fragment data-uid='fragment'>
    <div
      style={{
        width: 50,
        height: 50,
        backgroundColor: '#297374',
      }}
      data-uid='bbb'
      data-testid='bbb'
    />
  </React.Fragment>
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#292E74',
    }}
    data-uid='ccc'
    data-testid='ccc'
  />
</div>
`

const TestProjectMixedProperties = `
<div style={{ width: '100%', height: '100%' }} data-uid='container'>
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#CA1E4C80',
    }}
    data-uid='aaa'
    data-testid='aaa'
  />
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#297374',
    }}
    data-uid='bbb'
    data-testid='bbb'
  />
  <div
    style={{
      width: 50,
      height: 50,
      backgroundColor: '#292E74',
      display: 'inline-block',
    }}
    data-uid='ccc'
    data-testid='ccc'
  />
  <div
    style={{
      height: 80,
      width: 80,
      backgroundColor: '#D9DDAA80',
      display: 'inline-block',
    }}
    data-uid='ddd'
    data-testid='ddd'
  />
  <div
    style={{
      height: 80,
      width: 80,
      backgroundColor: '#DDAAB880',
      display: 'inline-block',
    }}
    data-uid='eee'
    data-testid='eee'
  />
</div>
`

const TestCodeWrappingTexts = `
<div style={{ width: 150, height: '100%' }} data-uid='container'>
  <span
    data-uid='aaa'
    data-testid='aaa'
  >Text 1 hello</span>
  <span
    data-uid='bbb'
    data-testid='bbb'
  >Text 2 very long text</span>
  <span
    data-uid='ccc'
    data-testid='ccc'
  >Text 3 this is an even longer text here</span>
  <span
    data-uid='ddd'
    data-testid='ddd'
  >Text 4 hi</span>
</div>
`

async function dragElement(
  renderResult: EditorRenderResult,
  targetTestId: string,
  dragDelta: WindowPoint,
  modifiers: Modifiers,
  expectedNavigatorTargetsDuringMove: Array<string>,
): Promise<void> {
  const targetElement = renderResult.renderedDOM.getByTestId(targetTestId)
  const targetElementBounds = targetElement.getBoundingClientRect()
  const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)

  const startPoint = windowPoint({ x: targetElementBounds.x + 5, y: targetElementBounds.y + 5 })
  await mouseClickAtPoint(canvasControlsLayer, startPoint, { modifiers: cmdModifier })
  await mouseDragFromPointWithDelta(canvasControlsLayer, startPoint, dragDelta, {
    modifiers: modifiers,
    midDragCallback: async () => {
      expect(
        renderResult.getEditorState().derived.visibleNavigatorTargets.map(EP.toString),
      ).toEqual(expectedNavigatorTargetsDuringMove)
    },
  })
}

async function startDraggingAnElement(
  renderResult: EditorRenderResult,
  targetTestId: string,
  dragDelta: WindowPoint,
): Promise<void> {
  const targetElement = renderResult.renderedDOM.getByTestId(targetTestId)
  const targetElementBounds = targetElement.getBoundingClientRect()
  const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)

  const startPoint = windowPoint({ x: targetElementBounds.x + 5, y: targetElementBounds.y + 5 })

  await mouseDownAtPoint(canvasControlsLayer, startPoint, {})
  await mouseMoveToPoint(canvasControlsLayer, dragDelta, {})
}

describe('Flow Reorder Strategy (Mixed Display Type)', () => {
  it('simple dragging the element in a block reorders it', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(TestProjectBlockElements()),
      'await-first-dom-report',
    )

    // drag element 'CCC' up a little to replace it with it's direct sibling
    const dragDelta = windowPoint({ x: 0, y: -45 })
    await dragElement(renderResult, 'ccc', dragDelta, emptyModifiers, [
      'utopia-storyboard-uid/scene-aaa',
      'utopia-storyboard-uid/scene-aaa/app-entity',
      'utopia-storyboard-uid/scene-aaa/app-entity:container',
      'utopia-storyboard-uid/scene-aaa/app-entity:container/aaa',
      'utopia-storyboard-uid/scene-aaa/app-entity:container/ccc',
      'utopia-storyboard-uid/scene-aaa/app-entity:container/bbb',
    ])

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(TestProjectCCCDraggedToSecond),
    )
  })

  it('dragging an element over a sibling with float:right will skip reorder', async () => {
    const TestCodeWithFloat = `
      <div style={{ width: 100, height: 50, position: 'absolute' }} data-uid='container'>
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: '#CA1E4C80',
            float: 'right'
          }}
          data-uid='aaa'
          data-testid='aaa'
        />
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: '#FF00FF',
          }}
          data-uid='bbb'
          data-testid='bbb'
        />
      </div>
    `
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(TestCodeWithFloat),
      'await-first-dom-report',
    )

    const elementAFrame = MetadataUtils.getFrameInCanvasCoords(
      EP.fromString('utopia-storyboard-uid/scene-aaa/app-entity:container/aaa'),
      renderResult.getEditorState().editor.jsxMetadata,
    )
    const elementBFrame = MetadataUtils.getFrameInCanvasCoords(
      EP.fromString('utopia-storyboard-uid/scene-aaa/app-entity:container/bbb'),
      renderResult.getEditorState().editor.jsxMetadata,
    )

    if (
      elementAFrame == null ||
      elementBFrame == null ||
      isInfinityRectangle(elementAFrame) ||
      isInfinityRectangle(elementBFrame)
    ) {
      assert.fail()
    } else {
      // drag element 'B' over 'A' will skip reorder
      const dragDelta = windowPoint(rectangleDifference(elementBFrame, elementAFrame))
      await dragElement(renderResult, 'bbb', dragDelta, emptyModifiers, [
        'utopia-storyboard-uid/scene-aaa',
        'utopia-storyboard-uid/scene-aaa/app-entity',
        'utopia-storyboard-uid/scene-aaa/app-entity:container',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/aaa',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/bbb',
      ])

      await renderResult.getDispatchFollowUpActionsFinished()
      expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippet(TestCodeWithFloat),
      )
    }
  })
  it('flow reorder is not allowed with mixed inline and block siblings', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(TestProjectMixedProperties),
      'await-first-dom-report',
    )

    // drag element 'CCC' up a little
    const dragDelta = windowPoint({ x: 0, y: -10 })
    await startDraggingAnElement(renderResult, 'ccc', dragDelta)

    await renderResult.getDispatchFollowUpActionsFinished()
    const strategies = renderResult.getEditorState().strategyState.sortedApplicableStrategies

    const flowReorderNotInStrategies = Array.isArray(strategies)
      ? strategies.findIndex((strategy) => strategy.name === 'FLOW_REORDER')
      : `no applicable strategies`

    expect(flowReorderNotInStrategies).toEqual(-1)
  })
  it('flow reorder is not allowed in a layout with wrapping multiline texts', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(TestCodeWrappingTexts),
      'await-first-dom-report',
    )

    // drag element 'CCC' up a little
    const dragDelta = windowPoint({ x: 0, y: -10 })
    await startDraggingAnElement(renderResult, 'ccc', dragDelta)

    await renderResult.getDispatchFollowUpActionsFinished()
    const strategies = renderResult.getEditorState().strategyState.sortedApplicableStrategies

    const flowReorderNotInStrategies = Array.isArray(strategies)
      ? strategies.findIndex((strategy) => strategy.name === 'FLOW_REORDER')
      : `no applicable strategies`

    expect(flowReorderNotInStrategies).toEqual(-1)
  })
  it('flow reorder is not allowed in a layout where there are multiple columns', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(TestProjectBlockElements(`columns: 2`)),
      'await-first-dom-report',
    )

    // drag element 'CCC' up a little
    const dragDelta = windowPoint({ x: 0, y: -10 })
    await startDraggingAnElement(renderResult, 'ccc', dragDelta)

    await renderResult.getDispatchFollowUpActionsFinished()
    const strategies = renderResult.getEditorState().strategyState.sortedApplicableStrategies

    const flowReorderNotInStrategies = Array.isArray(strategies)
      ? strategies.findIndex((strategy) => strategy.name === 'FLOW_REORDER')
      : `no applicable strategies`

    expect(flowReorderNotInStrategies).toEqual(-1)
  })
  it('simple dragging the element in an inline-block with right to left direction reorders it', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(`
<div style={{ width: '100%', height: '100%', position: 'absolute', direction: 'rtl'}} data-uid='container'>
  <div
    style={{
      width: 50,
      height: 50,
      display: 'inline-block',
      backgroundColor: '#CA1E4C80',
    }}
    data-uid='aaa'
    data-testid='aaa'
  />
  <div
    style={{
      width: 50,
      height: 50,
      display: 'inline-block',
      backgroundColor: '#297374',
    }}
    data-uid='bbb'
    data-testid='bbb'
  />
  <div
    style={{
      width: 50,
      height: 50,
      display: 'inline-block',
      backgroundColor: '#292E74',
    }}
    data-uid='ccc'
    data-testid='ccc'
  />
</div>`),
      'await-first-dom-report',
    )

    // drag element 'CCC' right will replace with sibling 'BBB'
    const dragDelta = windowPoint({ x: 45, y: 0 })
    await dragElement(renderResult, 'ccc', dragDelta, emptyModifiers, [
      'utopia-storyboard-uid/scene-aaa',
      'utopia-storyboard-uid/scene-aaa/app-entity',
      'utopia-storyboard-uid/scene-aaa/app-entity:container',
      'utopia-storyboard-uid/scene-aaa/app-entity:container/aaa',
      'utopia-storyboard-uid/scene-aaa/app-entity:container/ccc',
      'utopia-storyboard-uid/scene-aaa/app-entity:container/bbb',
    ])

    await renderResult.getDispatchFollowUpActionsFinished()
    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
<div style={{ width: '100%', height: '100%', position: 'absolute', direction: 'rtl'}} data-uid='container'>
  <div
    style={{
      width: 50,
      height: 50,
      display: 'inline-block',
      backgroundColor: '#CA1E4C80',
    }}
    data-uid='aaa'
    data-testid='aaa'
  />
  <div
    style={{
      width: 50,
      height: 50,
      display: 'inline-block',
      backgroundColor: '#292E74',
    }}
    data-uid='ccc'
    data-testid='ccc'
  />
  <div
    style={{
      width: 50,
      height: 50,
      display: 'inline-block',
      backgroundColor: '#297374',
    }}
    data-uid='bbb'
    data-testid='bbb'
  />
</div>
`),
    )
  })

  describe('with fragments as siblings', () => {
    it('simple dragging the element in a block reorders it', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(TestProjectBlockElementsWithFragment()),
        'await-first-dom-report',
      )

      // drag element 'CCC' up a little to replace it with it's direct sibling
      const dragDelta = windowPoint({ x: 0, y: -45 })
      await dragElement(renderResult, 'ccc', dragDelta, emptyModifiers, [
        'utopia-storyboard-uid/scene-aaa',
        'utopia-storyboard-uid/scene-aaa/app-entity',
        'utopia-storyboard-uid/scene-aaa/app-entity:container',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/aaa',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/fragment/bbb',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/ccc',
      ])

      await renderResult.getDispatchFollowUpActionsFinished()

      expect(Object.keys(renderResult.getEditorState().editor.spyMetadata)).toEqual([
        'utopia-storyboard-uid',
        'utopia-storyboard-uid/scene-aaa',
        'utopia-storyboard-uid/scene-aaa/app-entity',
        'utopia-storyboard-uid/scene-aaa/app-entity:container',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/aaa',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/ccc', // <- ccc moves to above the fragment
        'utopia-storyboard-uid/scene-aaa/app-entity:container/fragment',
        'utopia-storyboard-uid/scene-aaa/app-entity:container/fragment/bbb',
      ])
    })
  })
})
