/**
 * ExpandableText - مكون لعرض النصوص الطويلة مع إمكانية التوسيع
 * يعرض جزءاً من النص مع زر "عرض المزيد" للنصوص الطويلة
 */
import { useState } from "react";
import { cn } from "../../lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

const ExpandableText = ({ 
  text = "", 
  maxLength = 50, 
  className = "",
  showToggle = true,
  expandLabel = "المزيد",
  collapseLabel = "أقل"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If text is empty or short enough, just return it
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text || "-"}</span>;
  }

  const displayText = isExpanded ? text : text.slice(0, maxLength) + "...";

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <span className={isExpanded ? "whitespace-pre-wrap" : ""}>{displayText}</span>
      {showToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
        >
          {isExpanded ? (
            <>
              {collapseLabel}
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              {expandLabel}
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </span>
  );
};

export default ExpandableText;
