"use client";

import { Loader2, FilePlus, FileEdit, Eye, Trash2, ArrowRightLeft } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: string;
  args?: {
    command?: string;
    path?: string;
    new_path?: string;
  };
  result?: unknown;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function getToolDescription(toolInvocation: ToolInvocation): { label: string; icon: React.ComponentType<{ className?: string }> } {
  const { toolName, args } = toolInvocation;
  const command = args?.command;
  const path = args?.path;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return { label: `Creating ${path || "file"}`, icon: FilePlus };
      case "str_replace":
        return { label: `Editing ${path || "file"}`, icon: FileEdit };
      case "insert":
        return { label: `Editing ${path || "file"}`, icon: FileEdit };
      case "view":
        return { label: `Reading ${path || "file"}`, icon: Eye };
      default:
        return { label: `Modifying ${path || "file"}`, icon: FileEdit };
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "delete":
        return { label: `Deleting ${path || "file"}`, icon: Trash2 };
      case "rename":
        return { label: `Moving ${path || "file"}`, icon: ArrowRightLeft };
      default:
        return { label: `Managing ${path || "file"}`, icon: FileEdit };
    }
  }

  return { label: toolName, icon: FileEdit };
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isComplete = toolInvocation.state === "result" && toolInvocation.result !== undefined;
  const { label, icon: Icon } = getToolDescription(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <Icon className="w-3 h-3 text-emerald-600" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
