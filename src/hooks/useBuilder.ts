import { useState, useCallback } from 'react';
import { exportHTMLCode } from '@/utils/builderExport';
import { BuilderComponent, BuilderPage, ComponentType, COMPONENT_DEFINITIONS } from '@/types/builder';

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useBuilder() {
  const [pages, setPages] = useState<BuilderPage[]>([
    { id: generateId(), name: 'Home', components: [], createdAt: new Date(), updatedAt: new Date() }
  ]);
  const [activePageId, setActivePageId] = useState(pages[0].id);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [history, setHistory] = useState<BuilderComponent[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const activePage = pages.find(p => p.id === activePageId);
  const components = activePage?.components || [];

  const pushHistory = useCallback((newComponents: BuilderComponent[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newComponents];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updateComponents = useCallback((newComponents: BuilderComponent[]) => {
    setPages(prev => prev.map(p =>
      p.id === activePageId
        ? { ...p, components: newComponents, updatedAt: new Date() }
        : p
    ));
    pushHistory(newComponents);
  }, [activePageId, pushHistory]);

  const addComponent = useCallback((type: ComponentType, index?: number) => {
    const def = COMPONENT_DEFINITIONS.find(d => d.type === type);
    if (!def) return;

    const newComponent: BuilderComponent = {
      id: generateId(),
      type,
      props: { ...def.defaultProps },
      styles: def.defaultStyles ? { ...def.defaultStyles } : {},
      children: type === 'container' || type === 'grid' || type === 'form' ? [] : undefined,
    };

    const newComponents = [...components];
    if (index !== undefined) {
      newComponents.splice(index, 0, newComponent);
    } else {
      newComponents.push(newComponent);
    }
    updateComponents(newComponents);
    setSelectedComponentId(newComponent.id);
    return newComponent.id;
  }, [components, updateComponents]);

  const removeComponent = useCallback((id: string) => {
    const removeRecursive = (comps: BuilderComponent[]): BuilderComponent[] =>
      comps.filter(c => c.id !== id).map(c => ({
        ...c,
        children: c.children ? removeRecursive(c.children) : undefined,
      }));
    updateComponents(removeRecursive(components));
    if (selectedComponentId === id) setSelectedComponentId(null);
  }, [components, selectedComponentId, updateComponents]);

  const updateComponentProps = useCallback((id: string, props: Record<string, any>) => {
    const updateRecursive = (comps: BuilderComponent[]): BuilderComponent[] =>
      comps.map(c => {
        if (c.id === id) return { ...c, props: { ...c.props, ...props } };
        if (c.children) return { ...c, children: updateRecursive(c.children) };
        return c;
      });
    updateComponents(updateRecursive(components));
  }, [components, updateComponents]);

  const updateComponentStyles = useCallback((id: string, styles: Record<string, string>) => {
    const updateRecursive = (comps: BuilderComponent[]): BuilderComponent[] =>
      comps.map(c => {
        if (c.id === id) return { ...c, styles: { ...c.styles, ...styles } };
        if (c.children) return { ...c, children: updateRecursive(c.children) };
        return c;
      });
    updateComponents(updateRecursive(components));
  }, [components, updateComponents]);

  const moveComponent = useCallback((fromIndex: number, toIndex: number) => {
    const newComponents = [...components];
    const [moved] = newComponents.splice(fromIndex, 1);
    newComponents.splice(toIndex, 0, moved);
    updateComponents(newComponents);
  }, [components, updateComponents]);

  const duplicateComponent = useCallback((id: string) => {
    const findAndDuplicate = (comps: BuilderComponent[]): BuilderComponent[] => {
      const result: BuilderComponent[] = [];
      for (const c of comps) {
        result.push(c);
        if (c.id === id) {
          const cloneWithNewIds = (comp: BuilderComponent): BuilderComponent => ({
            ...comp,
            id: generateId(),
            children: comp.children?.map(cloneWithNewIds),
          });
          result.push(cloneWithNewIds(c));
        }
      }
      return result;
    };
    updateComponents(findAndDuplicate(components));
  }, [components, updateComponents]);

  const setComponentsFromAI = useCallback((newComponents: unknown) => {
    const list = normalizeAIComponents(newComponents);
    if (!list.length) throw new Error('The AI did not return any page sections. Please try again.');
    updateComponents(list);
    setSelectedComponentId(null);
  }, [updateComponents]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPages(prev => prev.map(p =>
        p.id === activePageId
          ? { ...p, components: history[newIndex], updatedAt: new Date() }
          : p
      ));
    }
  }, [historyIndex, history, activePageId]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPages(prev => prev.map(p =>
        p.id === activePageId
          ? { ...p, components: history[newIndex], updatedAt: new Date() }
          : p
      ));
    }
  }, [historyIndex, history, activePageId]);

  const addPage = useCallback((name: string) => {
    const newPage: BuilderPage = {
      id: generateId(),
      name,
      components: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
  }, []);

  const deletePage = useCallback((id: string) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter(p => p.id !== id));
    if (activePageId === id) setActivePageId(pages[0].id === id ? pages[1].id : pages[0].id);
  }, [pages, activePageId]);

  const getSelectedComponent = useCallback((): BuilderComponent | null => {
    if (!selectedComponentId) return null;
    const findRecursive = (comps: BuilderComponent[]): BuilderComponent | null => {
      for (const c of comps) {
        if (c.id === selectedComponentId) return c;
        if (c.children) {
          const found = findRecursive(c.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findRecursive(components);
  }, [selectedComponentId, components]);

  const exportToHTML = useCallback(() => exportHTMLCode(components, activePage?.name || 'My Page'), [components, activePage]);

  return {
    pages,
    activePage,
    activePageId,
    setActivePageId,
    components,
    selectedComponentId,
    setSelectedComponentId,
    addComponent,
    removeComponent,
    updateComponentProps,
    updateComponentStyles,
    moveComponent,
    duplicateComponent,
    setComponentsFromAI,
    getSelectedComponent,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    addPage,
    deletePage,
    exportToHTML,
  };
}

// AI replies sometimes wrap the list ({ components: [...] }) or return one section.
// Accept those shapes, keep only real sections, and make sure every one has an id.
export function normalizeAIComponents(input: unknown): BuilderComponent[] {
  let value: unknown = input;
  for (let i = 0; i < 3 && value && !Array.isArray(value) && typeof value === 'object'; i++) {
    const obj = value as Record<string, unknown>;
    const inner = obj.components ?? obj.sections ?? obj.page ?? obj.children;
    if (inner === undefined) break;
    value = inner;
  }
  if (value && !Array.isArray(value) && typeof value === 'object' && 'type' in value) value = [value];
  if (!Array.isArray(value)) return [];
  let n = 0;
  const fix = (items: unknown[]): BuilderComponent[] => items
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && typeof (c as { type?: unknown }).type === 'string')
    .map((c) => ({
      ...c,
      id: typeof c.id === 'string' && c.id ? c.id : `ai-${Date.now()}-${n++}`,
      type: c.type,
      props: c.props && typeof c.props === 'object' ? c.props : {},
      ...(Array.isArray(c.children) ? { children: fix(c.children) } : {}),
    }) as BuilderComponent);
  return fix(value);
}
