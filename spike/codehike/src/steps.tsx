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

export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<StepProps>[];
  const { setSteps } = useStepsMeta();
  const metas = items.map(({ props: { id, file, region, images } }) => ({ id, file, region, images }));
  const key = JSON.stringify(metas);

  useLayoutEffect(() => setSteps(JSON.parse(key) as StepMeta[]), [key, setSteps]);

  return items.map((item, index) => (
    <Selectable key={item.props.id} index={index} selectOn={["scroll", "click"]} id={item.props.id} className="step">
      {item}
    </Selectable>
  ));
}

export function Step({ children }: StepProps) {
  return <>{children}</>;
}
