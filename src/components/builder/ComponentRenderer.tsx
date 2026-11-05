import { BuilderComponent } from '@/types/builder';
import { cn } from '@/lib/utils';
import { BuilderSection } from '@/lib/BuilderPage';
import { BUILDER_PAGE_CSS } from '@/lib/builderPageStyles';

interface ComponentRendererProps {
  component: BuilderComponent;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isPreview?: boolean;
}

export function ComponentRenderer({ component, isSelected, onSelect, isPreview = false }: ComponentRendererProps) {
  const { type, props, styles, id } = component;

  const wrapperClass = cn(
    'relative group transition-all',
    !isPreview && 'cursor-pointer',
    !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2 rounded',
    !isPreview && !isSelected && 'hover:ring-1 hover:ring-primary/40 hover:ring-offset-1 rounded'
  );

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    onSelect(id);
  };

  const renderContent = () => <BuilderSection section={component} renderChild={child => (
    <ComponentRenderer key={child.id} component={child as BuilderComponent} isSelected={false} onSelect={onSelect} isPreview={isPreview} />
  )} />;

  return (
    <div className={cn(wrapperClass, "builder-page")} onClick={handleClick}>
      <style>{BUILDER_PAGE_CSS}</style>
      {renderContent()}
      {!isPreview && isSelected && (
        <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-t font-medium z-10">
          {type}
        </div>
      )}
    </div>
  );
}
