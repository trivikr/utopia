import { fireEvent } from '@testing-library/react'
import { forElementOptic } from '../../core/model/common-optics'
import {
  conditionalWhenFalseOptic,
  jsxConditionalExpressionOptic,
} from '../../core/model/conditionals'
import { JSXElementChild } from '../../core/shared/element-template'
import { unsafeGet } from '../../core/shared/optics/optic-utilities'
import { Optic } from '../../core/shared/optics/optics'
import { BakedInStoryboardUID } from '../../core/model/scene-utils'
import * as EP from '../../core/shared/element-path'
import { altCmdModifier, cmdModifier } from '../../utils/modifiers'
import { selectComponents } from '../editor/actions/meta-actions'
import { EditorState, navigatorEntryToKey } from '../editor/store/editor-state'
import { CanvasControlsContainerID } from './controls/new-canvas-controls'
import {
  mouseClickAtPoint,
  openContextMenuAndClickOnItem,
  pressKey,
} from './event-helpers.test-utils'
import type { EditorRenderResult } from './ui-jsx.test-utils'
import {
  getPrintedUiJsCode,
  getPrintedUiJsCodeWithoutUIDs,
  makeTestProjectCodeWithSnippet,
  makeTestProjectCodeWithSnippetWithoutUIDs,
  renderTestEditorWithCode,
  TestAppUID,
  TestSceneUID,
} from './ui-jsx.test-utils'
import { expectNoAction, selectComponentsForTest, wait } from '../../utils/utils.test-utils'
import { MetadataUtils } from '../../core/model/element-metadata-utils'
import type { ElementPath } from '../../core/shared/project-file-types'
import { getDomRectCenter } from '../../core/shared/dom-utils'
import { wrapInElement } from '../editor/actions/action-creators'
import { generateUidWithExistingComponents } from '../../core/model/element-template-utils'
import { defaultTransparentViewElement } from '../editor/defaults'
import { FOR_TESTS_setNextGeneratedUid } from '../../core/model/element-template-utils.test-utils'

function expectAllSelectedViewsToHaveMetadata(editor: EditorRenderResult) {
  const selectedViews = editor.getEditorState().editor.selectedViews

  expect(selectedViews.length > 0).toEqual(true)

  expect(
    editor
      .getEditorState()
      .editor.selectedViews.every(
        (path) =>
          MetadataUtils.findElementByElementPath(
            editor.getEditorState().editor.jsxMetadata,
            path,
          ) != null,
      ),
  ).toEqual(true)
}

function expectElementSelected(editor: EditorRenderResult, path: ElementPath) {
  expect(editor.getEditorState().editor.selectedViews.find((p) => EP.pathsEqual(p, path))).toEqual(
    path,
  )
}

type Trigger = (editor: EditorRenderResult, testid: string) => Promise<void>
type TemplatedTestWithTrigger = (trigger: Trigger) => Promise<void>

const expectTemplatedTestWithTrigger = async (
  testWithTrigger: TemplatedTestWithTrigger,
  trigger: Trigger,
) => testWithTrigger(trigger)

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectNoAction", "expectTemplatedTestWithTrigger"] }] */

describe('canvas context menu', () => {
  it('clicking on paste layout menu item pastes layout properties', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(
        `<div style={{ ...props.style }} data-uid='aaa'>
          <div
            style={{ width: 200, height: 150, borderRadius: 5 }}
            data-uid='bbb'
          >paste</div>
          <div
            style={{ position: 'absolute', top: 20, opacity: 0.2 }}
            data-uid='ccc'
            data-testid='ccc'
          >hello</div>
        </div>`,
      ),
      'await-first-dom-report',
    )

    const copyPropertiesFrom = EP.fromString(
      `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/bbb`,
    )
    await renderResult.dispatch(selectComponents([copyPropertiesFrom], false), true)

    // copy properties first
    await pressKey('c', { modifiers: altCmdModifier })
    await renderResult.getDispatchFollowUpActionsFinished()

    const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
    const element = renderResult.renderedDOM.getByTestId('ccc')
    const elementCenter = getDomRectCenter(element.getBoundingClientRect())
    await mouseClickAtPoint(canvasControlsLayer, elementCenter)
    await renderResult.getDispatchFollowUpActionsFinished()

    // paste only layout properties
    await openContextMenuAndClickOnItem(
      renderResult,
      canvasControlsLayer,
      elementCenter,
      'Paste Layout',
    )
    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(
        `<div style={{ ...props.style }} data-uid='aaa'>
          <div
            style={{ width: 200, height: 150, borderRadius: 5 }}
            data-uid='bbb'
          >paste</div>
          <div
            style={{ position: 'absolute', top: 20, opacity: 0.2, width: 200, height: 150 }}
            data-uid='ccc'
            data-testid='ccc'
          >hello</div>
        </div>`,
      ),
    )
  })
  it('clicking on paste style menu item pastes style properties', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(
        `<div style={{ ...props.style }} data-uid='aaa'>
          <div
            style={{ width: 200, opacity: 0.5, fontSize: 20, borderRadius: 5 }}
            data-uid='bbb'
          >paste</div>
          <div
            style={{ position: 'absolute', top: 20, opacity: 0.2, color: 'hotpink' }}
            data-uid='ccc'
            data-testid='ccc'
          >hello</div>
        </div>`,
      ),
      'await-first-dom-report',
    )

    const copyPropertiesFrom = EP.fromString(
      `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/bbb`,
    )
    await renderResult.dispatch(selectComponents([copyPropertiesFrom], false), true)

    // copy properties first
    await pressKey('c', { modifiers: altCmdModifier })
    await renderResult.getDispatchFollowUpActionsFinished()

    const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
    const element = renderResult.renderedDOM.getByTestId('ccc')
    const elementCenter = getDomRectCenter(element.getBoundingClientRect())
    await mouseClickAtPoint(canvasControlsLayer, elementCenter)
    await renderResult.getDispatchFollowUpActionsFinished()

    // paste only style properties
    await openContextMenuAndClickOnItem(
      renderResult,
      canvasControlsLayer,
      elementCenter,
      'Paste Style',
    )
    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(
        `<div style={{ ...props.style }} data-uid='aaa'>
          <div
            style={{ width: 200, opacity: 0.5, fontSize: 20, borderRadius: 5 }}
            data-uid='bbb'
          >paste</div>
          <div
            style={{ position: 'absolute', top: 20, opacity: 0.5, fontSize: 20, borderRadius: 5 }}
            data-uid='ccc'
            data-testid='ccc'
          >hello</div>
        </div>`,
      ),
    )
  })

  describe('Bring to Front / Send to Back', () => {
    const testCaseElementInConditional: TemplatedTestWithTrigger = async (
      trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
    ) => {
      const editor = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(`
      <div data-uid='container'>
        {
          // @utopia/uid=conditional
          [].length === 0 ? (
            <div
              style={{
              height: 150,
                width: 150,
                position: 'absolute',
                left: 154,
                top: 134,
                backgroundColor: 'lightblue',
              }}
              data-uid='then-div'
              data-testid='then-div'
            />
          ) : 'Test' 
        }
        </div>
      `),
        'await-first-dom-report',
      )

      const initialEditor = getPrintedUiJsCode(editor.getEditorState())

      const targetPath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/conditional/then-div`,
      )

      await selectComponentsForTest(editor, [targetPath])

      // to ensure that the selected element is actually an element in the project
      expectAllSelectedViewsToHaveMetadata(editor)
      await expectNoAction(editor, async () => {
        await trigger(editor, 'then-div')
      })

      expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(initialEditor)

      expectElementSelected(editor, targetPath)
    }

    describe('Bring Forward', () => {
      const BringForwardLabel = 'Bring Forward'

      const testCaseElementInBack: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='first' data-testid='first'>First</span>
          <span data-uid='second'>Second</span>
          <span data-uid='third'>Third</span>
          </div>
        `),
          'await-first-dom-report',
        )

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/first`,
        )

        await selectComponentsForTest(editor, [targetPath])
        await trigger(editor, 'first')

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(
          makeTestProjectCodeWithSnippet(`
            <div data-uid='container'>
              <span data-uid='second'>Second</span>
              <span data-uid='first' data-testid='first'>First</span>
              <span data-uid='third'>Third</span>
            </div>
        `),
        )

        expectElementSelected(editor, targetPath)
      }

      const testCaseElementOnTop: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
          <div data-uid='container'>
            <span data-uid='third'>Third</span>
            <span data-uid='second'>Second</span>
            <span data-uid='first' data-testid='first'>First</span>
          </div>
          `),
          'await-first-dom-report',
        )

        const initialEditor = getPrintedUiJsCode(editor.getEditorState())

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/first`,
        )

        await selectComponentsForTest(editor, [targetPath])

        // to ensure that the selected element is actually an element in the project
        expectAllSelectedViewsToHaveMetadata(editor)
        await expectNoAction(editor, async () => {
          await trigger(editor, 'first')
        })

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(initialEditor)

        expectElementSelected(editor, targetPath)
      }

      describe('context menu', () => {
        const contextMenuTrigger = async (e: EditorRenderResult, testid: string) => {
          const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
          const element = e.renderedDOM.getByTestId(testid)
          const elementCenter = getDomRectCenter(element.getBoundingClientRect())

          await openContextMenuAndClickOnItem(
            e,
            canvasControlsLayer,
            elementCenter,
            BringForwardLabel,
          )
          await e.getDispatchFollowUpActionsFinished()
        }

        it('clicking bring forward on element that is in the back', () =>
          expectTemplatedTestWithTrigger(testCaseElementInBack, contextMenuTrigger))
        it('clicking bring forward on element that is already on top', () =>
          expectTemplatedTestWithTrigger(testCaseElementOnTop, contextMenuTrigger))

        it('clicking bring forward on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(testCaseElementInConditional, contextMenuTrigger))
      })

      describe('shortcut', () => {
        const shortcutTrigger = () => pressKey(']', { modifiers: cmdModifier })
        it('clicking bring forward on element that is in the back', () =>
          expectTemplatedTestWithTrigger(testCaseElementInBack, shortcutTrigger))

        it('clicking bring forward on element that is already on top', () =>
          expectTemplatedTestWithTrigger(testCaseElementOnTop, shortcutTrigger))

        it('clicking bring forward on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(testCaseElementInConditional, shortcutTrigger))
      })
    })

    describe('Send Backward', () => {
      const SendBackwardLabel = 'Send Backward'

      const testCaseElementInBack: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='first' data-testid='first'>First</span>
          <span data-uid='second'>Second</span>
          <span data-uid='third'>Third</span>
        </div>
        `),
          'await-first-dom-report',
        )

        const initialEditor = getPrintedUiJsCode(editor.getEditorState())

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/first`,
        )

        await selectComponentsForTest(editor, [targetPath])

        // to ensure that the selected element is actually an element in the project
        expectAllSelectedViewsToHaveMetadata(editor)
        await expectNoAction(editor, async () => {
          await trigger(editor, 'first')
        })

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(initialEditor)

        expectElementSelected(editor, targetPath)
      }

      const testCaseElementOnTop: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='zero'>Zero</span>
          <span data-uid='first'>First</span>
          <span data-uid='second' data-testid='second'>Second</span>
        </div>
        `),
          'await-first-dom-report',
        )

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/second`,
        )

        await selectComponentsForTest(editor, [targetPath])
        await trigger(editor, 'second')

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='zero'>Zero</span>
          <span data-uid='second' data-testid='second'>Second</span>
          <span data-uid='first'>First</span>
        </div>
        `),
        )

        expectElementSelected(editor, targetPath)
      }

      describe('context menu', () => {
        it('clicking send backward on element that is already in the back', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInBack,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                SendBackwardLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))

        it('clicking send backward on element that is on top', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementOnTop,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                SendBackwardLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))

        it('clicking send backward on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInConditional,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                SendBackwardLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))
      })

      describe('shortcut', () => {
        it('clicking send backward on element that is already in the back', () =>
          expectTemplatedTestWithTrigger(testCaseElementInBack, () =>
            pressKey('[', { modifiers: cmdModifier }),
          ))

        it('clicking send backward on element that on top', () =>
          expectTemplatedTestWithTrigger(testCaseElementOnTop, () =>
            pressKey('[', { modifiers: cmdModifier }),
          ))

        it('clicking send backward on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(testCaseElementInConditional, () =>
            pressKey('[', { modifiers: cmdModifier }),
          ))
      })
    })

    describe('Bring To Front', () => {
      const BringToFrontLabel = 'Bring To Front'

      const testCaseElementInBack: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='zero' data-testid='zero'>Zero</span>
          <span data-uid='first'>First</span>
          <span data-uid='second'>Second</span>
        </div>
        `),
          'await-first-dom-report',
        )

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/zero`,
        )

        await selectComponentsForTest(editor, [targetPath])
        await trigger(editor, 'zero')

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(
          makeTestProjectCodeWithSnippet(`
            <div data-uid='container'>
              <span data-uid='first'>First</span>
              <span data-uid='second'>Second</span>
              <span data-uid='zero' data-testid='zero'>Zero</span>
            </div>
        `),
        )

        expectElementSelected(editor, targetPath)
      }

      const testCaseElementInFront: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='first'>First</span>
          <span data-uid='second'>Second</span>
          <span data-uid='third' data-testid='third'>Third</span>
        </div>
        `),
          'await-first-dom-report',
        )

        const initialEditor = getPrintedUiJsCode(editor.getEditorState())

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/third`,
        )

        await selectComponentsForTest(editor, [targetPath])

        // to ensure that the selected element is actually an element in the project
        expectAllSelectedViewsToHaveMetadata(editor)
        await expectNoAction(editor, async () => {
          await trigger(editor, 'third')
        })

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(initialEditor)

        expectElementSelected(editor, targetPath)
      }

      describe('context menu', () => {
        it('clicking bring to front on element that is already in the front', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInFront,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                BringToFrontLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))

        it('clicking bring to front on element in the back', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInBack,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                BringToFrontLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))

        it('clicking bring to front on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInConditional,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                BringToFrontLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))
      })

      describe('shortcut', () => {
        it('clicking bring to front on element that is already in the front', () =>
          expectTemplatedTestWithTrigger(testCaseElementInFront, () =>
            pressKey(']', { modifiers: altCmdModifier }),
          ))

        it('clicking bring to front on element in the back', () =>
          expectTemplatedTestWithTrigger(testCaseElementInBack, () =>
            pressKey(']', { modifiers: altCmdModifier }),
          ))

        it('clicking bring to front on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(testCaseElementInConditional, () =>
            pressKey(']', { modifiers: altCmdModifier }),
          ))
      })
    })

    describe('Send To Back', () => {
      const SendToBackLabel = 'Send To Back'

      const testCaseElementInBack: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='first' data-testid='first'>First</span>
          <span data-uid='second'>Second</span>
          <span data-uid='third'>Third</span>
        </div>
        `),
          'await-first-dom-report',
        )

        const initialEditor = getPrintedUiJsCode(editor.getEditorState())

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/first`,
        )

        await selectComponentsForTest(editor, [targetPath])

        // to ensure that the selected element is actually an element in the project
        expectAllSelectedViewsToHaveMetadata(editor)
        await expectNoAction(editor, async () => {
          await trigger(editor, 'first')
        })

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(initialEditor)
        expectElementSelected(editor, targetPath)
      }

      const testCaseElementInFront: TemplatedTestWithTrigger = async (
        trigger: (editor: EditorRenderResult, testid: string) => Promise<void>,
      ) => {
        const editor = await renderTestEditorWithCode(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='zero'>Zero</span>
          <span data-uid='first'>First</span>
          <span data-uid='second' data-testid='second'>Second</span>
        </div>
        `),
          'await-first-dom-report',
        )

        const targetPath = EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/second`,
        )

        await selectComponentsForTest(editor, [targetPath])
        // await expectNoAction(editor, async () => {
        await trigger(editor, 'second')
        // })

        expect(getPrintedUiJsCode(editor.getEditorState())).toEqual(
          makeTestProjectCodeWithSnippet(`
        <div data-uid='container'>
          <span data-uid='second' data-testid='second'>Second</span>
          <span data-uid='zero'>Zero</span>
          <span data-uid='first'>First</span>
        </div>
        `),
        )
        expectElementSelected(editor, targetPath)
      }

      describe('context menu', () => {
        it('clicking send to back on element that is already in the back', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInBack,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                SendToBackLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))

        it('clicking send to back on element that is in the front', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInFront,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                SendToBackLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))

        it('clicking send to back on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(
            testCaseElementInConditional,
            async (e: EditorRenderResult, testid: string) => {
              const canvasControlsLayer = e.renderedDOM.getByTestId(CanvasControlsContainerID)
              const element = e.renderedDOM.getByTestId(testid)
              const elementBounds = element.getBoundingClientRect()
              await openContextMenuAndClickOnItem(
                e,
                canvasControlsLayer,
                elementBounds,
                SendToBackLabel,
              )
              await e.getDispatchFollowUpActionsFinished()
            },
          ))
      })

      describe('shortcut', () => {
        it('clicking send to back on element that is already in the back', () =>
          expectTemplatedTestWithTrigger(testCaseElementInBack, () =>
            pressKey('[', { modifiers: altCmdModifier }),
          ))

        it('clicking send to back on element that is in the front', () =>
          expectTemplatedTestWithTrigger(testCaseElementInFront, () =>
            pressKey('[', { modifiers: altCmdModifier }),
          ))

        it('clicking send to back on element in a conditional branch', () =>
          expectTemplatedTestWithTrigger(testCaseElementInConditional, () =>
            pressKey('[', { modifiers: altCmdModifier }),
          ))
      })
    })

    it('Bring forward / send to back in a flex container', async () => {
      const editor = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(`
      <div
        style={{
          backgroundColor: '#aaaaaa33',
          position: 'absolute',
          left: 427,
          top: 128,
          width: 'max-content',
          height: 'max-content',
          display: 'flex',
          flexDirection: 'column',
          gap: 58.5,
          padding: '36px 57px',
        }}
        data-uid='container'
      >
        <div
          style={{
            backgroundColor: '#aaaaaa33',
            width: 78,
            height: 101,
            contain: 'layout',
          }}
          data-uid='element'
        />
        <div
          style={{
            backgroundColor: '#aaaaaa33',
            width: 66,
            height: 81,
            contain: 'layout',
          }}
          data-uid='duck'
        />
        <div
          style={{
            backgroundColor: '#aaaaaa33',
            width: 81,
            height: 35,
            contain: 'layout',
          }}
          data-uid='mallard'
        />
      </div>
      `),
        'await-first-dom-report',
      )

      expect(editor.getEditorState().derived.navigatorTargets.map(navigatorEntryToKey)).toEqual([
        'regular-utopia-storyboard-uid/scene-aaa',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/element',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/duck',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/mallard',
      ])

      const targetPath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:container/element`,
      )

      await selectComponentsForTest(editor, [targetPath])

      await pressKey(']', { modifiers: cmdModifier }) // Bring Forward

      expect(editor.getEditorState().derived.navigatorTargets.map(navigatorEntryToKey)).toEqual([
        'regular-utopia-storyboard-uid/scene-aaa',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/duck',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/element', // moved above duck
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/mallard',
      ])
      expectElementSelected(editor, targetPath)

      await pressKey('[', { modifiers: cmdModifier }) // Send Backward

      expect(editor.getEditorState().derived.navigatorTargets.map(navigatorEntryToKey)).toEqual([
        'regular-utopia-storyboard-uid/scene-aaa',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/element', // moved below duck, in its original place
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/duck',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/mallard',
      ])
      expectElementSelected(editor, targetPath)

      await pressKey(']', { modifiers: altCmdModifier }) // Bring To Front

      expect(editor.getEditorState().derived.navigatorTargets.map(navigatorEntryToKey)).toEqual([
        'regular-utopia-storyboard-uid/scene-aaa',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/duck',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/mallard',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/element', // moved above mallard and duck, to the front
      ])
      expectElementSelected(editor, targetPath)

      await pressKey('[', { modifiers: altCmdModifier }) // Send To Back

      expect(editor.getEditorState().derived.navigatorTargets.map(navigatorEntryToKey)).toEqual([
        'regular-utopia-storyboard-uid/scene-aaa',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/element', // moved below mallard and duck, to the back
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/duck',
        'regular-utopia-storyboard-uid/scene-aaa/app-entity:container/mallard',
      ])
      expectElementSelected(editor, targetPath)
    })
  })

  describe('wrap in from contextmenu', () => {
    it('wrap in div works inside a conditional on an expression', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
             {
               // @utopia/uid=conditional
               [].length === 0 ? (
                 <div
                   style={{
                    height: 150,
                     width: 150,
                     position: 'absolute',
                     left: 154,
                     top: 134,
                     backgroundColor: 'lightblue',
                   }}
                   data-uid='then-div'
                   data-testid='then-div'
                 />
               ) : 'Test' 
             }
           </div>`,
        ),
        'await-first-dom-report',
      )

      const conditionalPath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/conditional`,
      )
      const inactiveElementOptic = forElementOptic(conditionalPath)
        .compose(jsxConditionalExpressionOptic)
        .compose(conditionalWhenFalseOptic)
      const inactiveElement = unsafeGet(inactiveElementOptic, renderResult.getEditorState().editor)
      const testValuePath = EP.appendToPath(conditionalPath, inactiveElement.uid)

      await renderResult.dispatch(selectComponents([testValuePath], false), true)

      // Wrap it in a div.
      await renderResult.dispatch(
        [
          wrapInElement([testValuePath], {
            element: defaultTransparentViewElement(
              generateUidWithExistingComponents(
                renderResult.getEditorState().editor.projectContents,
              ),
            ),
            importsToAdd: {},
          }),
        ],
        true,
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
             {
               // @utopia/uid=conditional
               [].length === 0 ? (
                 <div
                   style={{
                    height: 150,
                     width: 150,
                     position: 'absolute',
                     left: 154,
                     top: 134,
                     backgroundColor: 'lightblue',
                   }}
                   data-testid='then-div'
                 />
               ) : (
                  <div style={{ position: 'absolute'}}>
                   {'Test'}
                 </div>
               )
             }
           </div>`,
        ),
      )
    })

    it('wrap in Group works inside a conditional on an element', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
             {
               // @utopia/uid=conditional
               [].length === 0 ? (
                 <div
                   style={{
                    height: 150,
                     width: 150,
                     position: 'absolute',
                     left: 154,
                     top: 134,
                     backgroundColor: 'lightblue',
                   }}
                   data-uid='then-div'
                   data-testid='then-div'
                 />
               ) : 'Test' 
             }
           </div>`,
        ),
        'await-first-dom-report',
      )

      const testValuePath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/conditional/then-div`,
      )

      await renderResult.dispatch(selectComponents([testValuePath], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('then-div')
      const elementBounds = element.getBoundingClientRect()
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        elementBounds,
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
             {
               // @utopia/uid=conditional
               [].length === 0 ? (
                 <Group style={{ position: 'absolute', left: 154, top: 134, width: 150, height: 150}}>
                   <div
                     style={{
                       height: 150,
                       width: 150,
                       position: 'absolute',
                       left: 0,
                       top: 0,
                       backgroundColor: 'lightblue',
                     }}
                     data-testid='then-div'
                   />
                 </Group>
               ) : (
                'Test' 
               )
             }
           </div>`,
        ),
      )
    })

    it('wrap in Group works on an element', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
             <div
               style={{
                 height: 150,
                 width: 150,
                 position: 'absolute',
                 left: 154,
                 top: 134,
                 backgroundColor: 'lightblue',
               }}
               data-uid='target-div'
               data-testid='target-div'
             />
           </div>`,
        ),
        'await-first-dom-report',
      )

      const testValuePath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/target-div`,
      )

      await renderResult.dispatch(selectComponents([testValuePath], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('target-div')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        elementBounds,
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(`${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/group`),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
             <Group style={{ position: 'absolute', left: 154, top: 134, width: 150, height: 150 }}>
               <div
                 style={{
                   height: 150,
                   width: 150,
                   position: 'absolute',
                   left: 0,
                   top: 0,
                   backgroundColor: 'lightblue',
                 }}
                 data-testid='target-div'
               />
             </Group>
           </div>`,
        ),
      )
    })

    it('wrap in Group works for single flex child', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
              data-uid='flex-row'
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
                data-uid='child-1'
              />
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 50,
                  contain: 'layout',
                }}
                data-uid='child-2'
              />
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 130,
                  height: 100,
                  contain: 'layout',
                }}
                data-uid='child-3'
              />
            </div>
           </div>`,
        ),
        'await-first-dom-report',
      )

      const child1Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/child-1`,
      )

      await renderResult.dispatch(selectComponents([child1Path], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('child-1')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        elementBounds,
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(`${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/group`),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
            >
              <Group
                style={{
                  contain: 'layout',
                  width: 100,
                  height: 100,
                }}
              >
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 100,
                    height: 100,
                    contain: 'layout',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                  }}
                  data-testid='child-1'
                />
              </Group>
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 50,
                  contain: 'layout',
                }}
              />
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 130,
                  height: 100,
                  contain: 'layout',
                }}
              />
            </div>
          </div>`,
        ),
      )
    })

    it('wrap in Group works for two flex children', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
              data-uid='flex-row'
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
                data-uid='child-1'
              />
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 50,
                  contain: 'layout',
                }}
                data-testid='child-2'
                data-uid='child-2'
              />
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 130,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-3'
                data-uid='child-3'
              />
            </div>
           </div>`,
        ),
        'await-first-dom-report',
      )

      const child2Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/child-2`,
      )
      const child3Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/child-3`,
      )

      await renderResult.dispatch(selectComponents([child2Path, child3Path], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('child-2')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        elementBounds,
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(`${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/group`),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
              />
              <Group
                style={{
                  contain: 'layout',
                  width: 250,
                  height: 100,
                }}
              >
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 100,
                    height: 50,
                    contain: 'layout',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                  }}
                  data-testid='child-2'
                />
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 130,
                    height: 100,
                    contain: 'layout',
                    position: 'absolute',
                    left: 120,
                    top: 0,
                  }}
                  data-testid='child-3'
                />
              </Group>
            </div>
          </div>`,
        ),
      )
    })

    it('wrap in Group works for two flex children wrapped in a Fragment, if the Fragment is selected', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
              data-uid='flex-row'
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
                data-uid='child-1'
              />
              <React.Fragment data-uid='fragment'>
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 100,
                    height: 50,
                    contain: 'layout',
                  }}
                  data-testid='child-2'
                  data-uid='child-2'
                />
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 130,
                    height: 100,
                    contain: 'layout',
                  }}
                  data-testid='child-3'
                  data-uid='child-3'
                />
              </React.Fragment>
            </div>
           </div>`,
        ),
        'await-first-dom-report',
      )

      const fragmentPath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/fragment`,
      )

      await renderResult.dispatch(selectComponents([fragmentPath], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('child-2')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        { x: elementBounds.x + 10, y: elementBounds.y + 10 },
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(`${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/group`),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
              />
              <Group
                style={{
                  contain: 'layout',
                  width: 250,
                  height: 100,
                }}
              >
                <React.Fragment>
                  <div
                    style={{
                      backgroundColor: '#aaaaaa33',
                      width: 100,
                      height: 50,
                      contain: 'layout',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                    }}
                    data-testid='child-2'
                  />
                  <div
                    style={{
                      backgroundColor: '#aaaaaa33',
                      width: 130,
                      height: 100,
                      contain: 'layout',
                      position: 'absolute',
                      left: 120,
                      top: 0,
                    }}
                    data-testid='child-3'
                  />
                </React.Fragment>
              </Group>
            </div>
          </div>`,
        ),
      )
    })
    it('wrap in Group works for two flex children wrapped in a Fragment, if the two Fragment children are selected', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
              data-uid='flex-row'
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
                data-uid='child-1'
              />
              <React.Fragment data-uid='fragment'>
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 100,
                    height: 50,
                    contain: 'layout',
                  }}
                  data-testid='child-2'
                  data-uid='child-2'
                />
                <div
                  style={{
                    backgroundColor: '#aaaaaa33',
                    width: 130,
                    height: 100,
                    contain: 'layout',
                  }}
                  data-testid='child-3'
                  data-uid='child-3'
                />
              </React.Fragment>
            </div>
           </div>`,
        ),
        'await-first-dom-report',
      )

      const child2Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/fragment/child-2`,
      )
      const child3Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/fragment/child-3`,
      )

      await renderResult.dispatch(selectComponents([child2Path, child3Path], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('child-2')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        { x: elementBounds.x + 10, y: elementBounds.y + 10 },
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(
          `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/flex-row/fragment/group`,
        ),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
            <div
              style={{
                backgroundColor: '#aaaaaa33',
                position: 'absolute',
                left: 50,
                top: 50,
                width: 'max-content',
                height: 'max-content',
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                padding: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#aaaaaa33',
                  width: 100,
                  height: 100,
                  contain: 'layout',
                }}
                data-testid='child-1'
              />
              <React.Fragment>
                <Group
                  style={{
                    contain: 'layout',
                    width: 250,
                    height: 100,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#aaaaaa33',
                      width: 100,
                      height: 50,
                      contain: 'layout',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                    }}
                    data-testid='child-2'
                  />
                  <div
                    style={{
                      backgroundColor: '#aaaaaa33',
                      width: 130,
                      height: 100,
                      contain: 'layout',
                      position: 'absolute',
                      left: 120,
                      top: 0,
                    }}
                    data-testid='child-3'
                  />
                </Group>
              </React.Fragment>
            </div>
          </div>`,
        ),
      )
    })

    it('wrap in Group shows Toast if a conditional expression is selected', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
            {
              // @utopia/uid=conditional
              [].length === 0 ? (
                <div
                  style={{
                    height: 150,
                    width: 150,
                    position: 'absolute',
                    left: 154,
                    top: 134,
                    backgroundColor: 'lightblue',
                  }}
                  data-uid='target-div'
                  data-testid='target-div'
                />
              ) : 'Test' 
            }
           </div>`,
        ),
        'await-first-dom-report',
      )

      const testValuePath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/conditional`,
      )

      await renderResult.dispatch(selectComponents([testValuePath], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('target-div')
      const elementBounds = element.getBoundingClientRect()
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        elementBounds,
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.toasts.length).toBe(1)
      expect(renderResult.getEditorState().editor.toasts[0].message).toEqual(
        'Only simple JSX Elements can be wrapped into Groups for now 🙇',
      )
    })

    it('wrap in Group works if a Fragment is selected', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
            <React.Fragment data-uid='fragment'>
              <div
                style={{
                  height: 150,
                  width: 150,
                  position: 'absolute',
                  left: 154,
                  top: 134,
                  backgroundColor: 'lightblue',
                }}
                data-uid='target-div'
                data-testid='target-div'
              />
            </React.Fragment>
          </div>`,
        ),
        'await-first-dom-report',
      )

      const testValuePath = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/fragment`,
      )

      await renderResult.dispatch(selectComponents([testValuePath], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('target-div')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        { x: elementBounds.x + 10, y: elementBounds.y + 10 },
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(`${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/group`),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(`
          <div style={{ ...props.style }}>
            <Group style={{ position: 'absolute', left: 154, top: 134, width: 150, height: 150 }}>
              <React.Fragment>
                <div
                  style={{
                    height: 150,
                    width: 150,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    backgroundColor: 'lightblue',
                  }}
                  data-testid='target-div'
                />
              </React.Fragment>
            </Group>
          </div>`),
      )
    })

    it('wrap in Group for multiselect can turn a slot empty', async () => {
      const renderResult = await renderTestEditorWithCode(
        makeTestProjectCodeWithSnippet(
          `<div style={{ ...props.style }} data-uid='aaa'>
             {
               // @utopia/uid=conditional
               [].length === 0 ? (
                 <div
                   style={{
                    height: 150,
                     width: 150,
                     position: 'absolute',
                     left: 154,
                     top: 134,
                     backgroundColor: 'lightblue',
                   }}
                   data-uid='then-div'
                   data-testid='then-div'
                 />
               ) : 'Test' 
             }
             <div
                style={{
                height: 50,
                  width: 50,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  backgroundColor: 'lightblue',
                }}
                data-uid='child-2'
                data-testid='child-2'
              />
           </div>`,
        ),
        'await-first-dom-report',
      )

      const child1Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/conditional/then-div`,
      )
      const child2Path = EP.fromString(
        `${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/child-2`,
      )

      await renderResult.dispatch(selectComponents([child1Path, child2Path], false), true)

      // Wrap it in a Group.
      const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)
      const element = renderResult.renderedDOM.getByTestId('then-div')
      const elementBounds = element.getBoundingClientRect()
      FOR_TESTS_setNextGeneratedUid('group')
      await openContextMenuAndClickOnItem(
        renderResult,
        canvasControlsLayer,
        elementBounds,
        'Group Selection',
      )
      await renderResult.getDispatchFollowUpActionsFinished()

      expect(renderResult.getEditorState().editor.selectedViews).toEqual([
        EP.fromString(`${BakedInStoryboardUID}/${TestSceneUID}/${TestAppUID}:aaa/group`),
      ])

      expect(getPrintedUiJsCodeWithoutUIDs(renderResult.getEditorState())).toEqual(
        makeTestProjectCodeWithSnippetWithoutUIDs(
          `<div style={{ ...props.style }}>
            {
              // @utopia/uid=conditional
              [].length === 0 ? (null) : 'Test' 
            }
            <Group
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 304,
                height: 284,
              }}
            >
              <div
                style={{
                  height: 150,
                  width: 150,
                  position: 'absolute',
                  left: 154,
                  top: 134,
                  backgroundColor: 'lightblue',
                }}
                data-testid='then-div'
              />
              <div
                  style={{
                  height: 50,
                  width: 50,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  backgroundColor: 'lightblue',
                }}
                data-testid='child-2'
              />
            </Group>
          </div>`,
        ),
      )
    })
  })
})
