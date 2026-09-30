declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';
  type Icon = FC<SVGProps<SVGSVGElement> & { size?: string | number }>;
  export const Activity: Icon; export const AlertCircle: Icon; export const ArrowDown: Icon; export const ArrowLeft: Icon;
  export const ArrowRight: Icon; export const ArrowUpRight: Icon; export const BarChart3: Icon; export const BrainCircuit: Icon;
  export const ChartNoAxesCombined: Icon; export const Check: Icon; export const CircleAlert: Icon; export const CircleHelp: Icon;
  export const Code2: Icon; export const Database: Icon; export const Download: Icon; export const FileCheck2: Icon;
  export const FileImage: Icon; export const FileText: Icon; export const FlaskConical: Icon; export const HeartHandshake: Icon;
  export const HeartPulse: Icon; export const Home: Icon; export const ImagePlus: Icon; export const Info: Icon;
  export const Layers3: Icon; export const LoaderCircle: Icon; export const Menu: Icon; export const Microscope: Icon;
  export const MoveUpRight: Icon; export const Printer: Icon; export const ScanEye: Icon; export const ScanLine: Icon;
  export const ShieldAlert: Icon; export const ShieldCheck: Icon; export const Sparkles: Icon; export const Target: Icon;
  export const Upload: Icon; export const X: Icon;
}

interface ImportMetaEnv { readonly VITE_API_BASE_URL?: string }
interface ImportMeta { readonly env: ImportMetaEnv }
