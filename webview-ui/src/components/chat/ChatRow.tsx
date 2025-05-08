import { VSCodeBadge, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react"
import deepEqual from "fast-deep-equal"
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useEvent, useSize } from "react-use"
import styled from "styled-components"
import {
	KlausApiReqInfo,
	KlausAskQuestion,
	KlausAskUseMcpServer,
	KlausMessage,
	KlausPlanModeResponse,
	KlausSayTool,
	COMPLETION_RESULT_CHANGES_FLAG,
	ExtensionMessage,
} from "../../../../src/shared/ExtensionMessage"
import { COMMAND_OUTPUT_STRING, COMMAND_REQ_APP_STRING } from "../../../../src/shared/combineCommandSequences"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { findMatchingResourceOrTemplate, getMcpServerDisplayName } from "../../utils/mcp"
import { vscode } from "../../utils/vscode"
import { glassEffect } from "../../styles/glassmorphism"
import { CheckpointControls } from "../common/CheckpointControls"
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "../common/CodeBlock"

const ChatRowContainer = styled.div`
  padding: 10px 8px 10px 15px;
  position: relative;
  margin: 6px 12px;
  
  // Glass effect for message bubbles
  ${glassEffect()}
  background: color-mix(in srgb, var(--vscode-editor-background) 85%, transparent);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  
  // Add subtle highlight on top edge
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 10px;
    right: 10px;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent, 
      color-mix(in srgb, var(--vscode-focusBorder) 15%, transparent),
      transparent);
  }
  
  // Improve hover states for better interactivity
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
    
    ${CheckpointControls} {
      opacity: 1;
    }
  }
`;

interface ChatRowProps {
  message: KlausMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
  lastModifiedMessage?: KlausMessage;
  isLast: boolean;
  onHeightChange: (isTaller: boolean) => void;
}

interface ChatRowContentProps extends Omit<ChatRowProps, "onHeightChange"> {}

export const ProgressIndicator = () => (
  <div
    style={{
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
    <div style={{ transform: "scale(0.55)", transformOrigin: "center" }}>
      <VSCodeProgressRing />
    </div>
  </div>
);

// For this example, I'll include a simplified version of the ChatRowContent component
export const ChatRowContent = (props: ChatRowContentProps) => {
  const { message, isExpanded, onToggleExpand, lastModifiedMessage, isLast } = props;
  
  // Simplified implementation
  // Simplified implementation that doesn't rely on specific properties
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ marginTop: "2px" }}>
          {message.type === "say" ? (
            <span className="codicon codicon-hubot" style={{ fontSize: "16px" }}></span>
          ) : (
            <span className="codicon codicon-account" style={{ fontSize: "16px" }}></span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {message.type === "say" ? "Klaus" : "You"}
        </div>
      </div>
      <div style={{ marginLeft: "24px", marginTop: "8px" }}>
        {message.text || ""}
      </div>
    </div>
  );
};

const ChatRow = memo(
  (props: ChatRowProps) => {
    const { isLast, onHeightChange, message, lastModifiedMessage } = props;
    const prevHeightRef = useRef(0);

    const [chatrow, { height }] = useSize(
      <ChatRowContainer>
        <ChatRowContent {...props} />
      </ChatRowContainer>
    );

    useEffect(() => {
      const isInitialRender = prevHeightRef.current === 0;
      if (isLast && height !== 0 && height !== Infinity && height !== prevHeightRef.current) {
        if (!isInitialRender) {
          onHeightChange(height > prevHeightRef.current);
        }
        prevHeightRef.current = height;
      }
    }, [height, isLast, onHeightChange, message]);

    return chatrow;
  },
  deepEqual
);

export default ChatRow;
