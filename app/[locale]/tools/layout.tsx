import { ToolBreadcrumbRouter } from "@/components/tools/shared/tool-breadcrumb-router";
import { ToolDetailRouter } from "@/components/tools/shared/tool-detail-router";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <><ToolBreadcrumbRouter />{children}<ToolDetailRouter /></>;
}
