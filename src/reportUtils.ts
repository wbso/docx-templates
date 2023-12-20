import { Node, TextNode, NonTextNode, Context, LoopStatus } from './types';
import { TemplateParseError } from './errors';
import { logger } from './debug';

// ==========================================
// Nodes and trees
// ==========================================
const cloneNodeWithoutChildren = (node: Node): Node => {
  if (node._fTextNode) {
    return {
      _children: [],
      _fTextNode: true,
      _text: node._text,
    };
  }
  return {
    _children: [],
    _fTextNode: false,
    _tag: node._tag,
    _attrs: node._attrs,
  };
};

const getNextSibling = (node: Node): Node | null => {
  const parent = node._parent;
  if (parent == null) return null;
  const siblings = parent._children;
  const idx = siblings.indexOf(node);
  if (idx < 0 || idx >= siblings.length - 1) return null;
  return siblings[idx + 1];
};

const insertTextSiblingAfter = (textNode: TextNode): TextNode => {
  const tNode = textNode._parent;
  if (!(tNode && !tNode._fTextNode && tNode._tag === 'w:t')) {
    throw new TemplateParseError(
      'Template syntax error: text node not within w:t'
    );
  }
  const tNodeParent = tNode._parent;
  if (tNodeParent == null)
    throw new TemplateParseError(
      'Template syntax error: w:t node has no parent'
    );
  const idx = tNodeParent._children.indexOf(tNode);
  if (idx < 0) throw new TemplateParseError('Template syntax error');
  const newTNode = cloneNodeWithoutChildren(tNode);
  newTNode._parent = tNodeParent;
  const newTextNode: Node = {
    _parent: newTNode,
    _children: [],
    _fTextNode: true,
    _text: '',
  };
  newTNode._children = [newTextNode];
  tNodeParent._children.splice(idx + 1, 0, newTNode);
  return newTextNode;
};

const newNonTextNode = (
  tag: string,
  attrs = {},
  children: Array<Node> = []
): NonTextNode => {
  const node: NonTextNode = {
    _fTextNode: false,
    _tag: tag,
    _attrs: attrs,
    _children: children,
  };
  node._children.forEach(child => {
    child._parent = node;
  });
  return node;
};

const newTextNode = (text: string): TextNode => {
  const node: TextNode = { _children: [], _fTextNode: true, _text: text };
  return node;
};

const addChild = (parent: Node, child: Node): Node => {
  parent._children.push(child);
  child._parent = parent;
  return child;
};

// ==========================================
// Loops
// ==========================================
const getCurLoop = (ctx: Context) => {
  if (!ctx.loops.length) return null;
  return ctx.loops[ctx.loops.length - 1];
};

const isLoopExploring = (ctx: Context) => {
  const curLoop = getCurLoop(ctx);
  return curLoop != null && curLoop.idx < 0;
};

const logLoop = (loops: Array<LoopStatus>) => {
  if (!loops.length) return;
  const level = loops.length - 1;
  const { varName, idx, loopOver, isIf } = loops[level];
  const idxStr = idx >= 0 ? idx + 1 : 'EXPLORATION';
  logger.debug(
    `${isIf ? 'IF' : 'FOR'} loop ` +
      `on ${level}:${varName}` +
      `${idxStr}/${loopOver.length}`
  );
};

// ==========================================
// Public API
// ==========================================
export {
  cloneNodeWithoutChildren,
  getNextSibling,
  insertTextSiblingAfter,
  newNonTextNode,
  newTextNode,
  addChild,
  getCurLoop,
  isLoopExploring,
  logLoop,
};
