import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Selectable } from "codehike/utils/selection";

export interface StepMeta {
  id: string;
  file?: string;
  region?: string;
  images?: string[];
}

type StepProps = StepMeta & { children?: ReactNode };

interface StepsMetaState {
  steps: StepMeta[];
  setSteps: (steps: StepMeta[]) => void;
}

const StepsMetaContext = createContext<StepsMetaState | null>(null);

export function StepsMetaProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<StepMeta[]>([]);
  return <StepsMetaContext value={{ steps, setSteps }}>{children}</StepsMetaContext>;
}

export function useStepsMeta(): StepsMetaState {
  const ctx = useContext(StepsMetaContext);
  if (!ctx) throw new Error("useStepsMeta outside StepsMetaProvider");
  return ctx;
}

const isStep = (node: ReactNode): node is ReactElement<StepProps> => isValidElement(node) && node.type === Step;

/** Makes each top-level `<Step>` selectable and passes other MDX content through. */
export function Steps({ children }: { children: ReactNode }) {
  const nodes = Children.toArray(children);
  const items = nodes.filter(isStep);
  const { setSteps } = useStepsMeta();
  const metas = items.map(({ props: { id, file, region, images } }) => ({ id, file, region, images }));
  const key = JSON.stringify(metas);

  useLayoutEffect(() => setSteps(JSON.parse(key) as StepMeta[]), [key, setSteps]);

  return nodes.map((node) =>
    isStep(node) ? (
      <Selectable key={node.props.id} index={items.indexOf(node)} selectOn={["scroll", "click"]} id={node.props.id} className="step">
        {node}
      </Selectable>
    ) : (
      node
    ),
  );
}

export function Step({ children }: StepProps) {
  return <>{children}</>;
}
