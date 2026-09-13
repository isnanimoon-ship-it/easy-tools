import { ToolBreadcrumbRouter } from "@/components/tools/shared/tool-breadcrumb-router";
import { ToolDetailRouter } from "@/components/tools/shared/tool-detail-router";
import { ToolVisitTracker } from "@/components/tools/shared/tool-visit-tracker";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <><ToolVisitTracker /><ToolBreadcrumbRouter />{children}<ToolDetailRouter /></>;
}
