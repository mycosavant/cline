import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import deepEqual from "fast-deep-equal"
import React, { CSSProperties, memo, useEffect, useMemo, useRef, useState } from "react"
import { useSize } from "react-use"
import styled from "styled-components"
import { BROWSER_VIEWPORT_PRESETS } from "../../../../src/shared/BrowserSettings"
import { BrowserAction, BrowserActionResult, KlausMessage, KlausSayBrowserAction} from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"
import { BrowserSettingsMenu } from "../browser/BrowserSettingsMenu"
import { CheckpointControls } from "../common/CheckpointControls"
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "../common/CodeBlock"
import { glassEffect } from "../../styles/glassmorphism"
import { ChatRowContent, ProgressIndicator } from "./ChatRow"

interface BrowserSessionRowProps {
	messages: KlausMessage[]
	isExpanded: (messageTs: number) => boolean
	onToggleExpand: (messageTs: number) => void
	lastModifiedMessage?: KlausMessage
	isLast: boolean
	onHeightChange: (isTaller: boolean) => void
}

const BrowserSessionRowContainer = styled.div`
  ${glassEffect()}
  padding: 15px;
  position: relative;
  margin: 10px;
  background: color-mix(in srgb, var(--vscode-editor-background) 85%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    
    ${CheckpointControls} {
      opacity: 1;
    }
  }
`;

const BrowserWindowContainer = styled.div<{maxWidth?: number}>`
  ${glassEffect()}
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--vscode-editor-background) 90%, transparent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin: 0 auto 10px auto;
  max-width: ${props => props.maxWidth ? `${props.maxWidth}px` : '100%'};
`;

const BrowserToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: color-mix(in srgb, var(--vscode-editor-background) 75%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--glass-border-color);
`;

const BrowserUrlBar = styled.div`
  flex: 1;
  background: color-mix(in srgb, var(--vscode-input-background) 90%, transparent);
  border: 1px solid var(--glass-border-color);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  color: var(--vscode-input-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BrowserScreenshotArea = styled.div<{ratio: number}>`
  width: 100%;
  padding-bottom: ${props => `${props.ratio}%`};
  position: relative;
  background-color: var(--vscode-input-background);
`;

const BrowserScreenshot = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.01);
  }
`;

const BrowserActionBox = styled.div`
  ${glassEffect()}
  margin-top: 10px;
  background: color-mix(in srgb, ${CODE_BLOCK_BG_COLOR} 85%, transparent);
  border-radius: 6px;
  overflow: hidden;
`;

const BrowserActionRow = styled.div`
  display: flex;
  align-items: center;
  padding: 9px 10px;
  font-weight: 500;
`;

const BrowserCursor = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  pointer-events: none;
  z-index: 10;
`;

const BrowserSessionRow = memo((props: BrowserSessionRowProps) => {
  const { messages, isLast, onHeightChange, lastModifiedMessage } = props;
  const { browserSettings } = useExtensionState();
  const prevHeightRef = useRef(0);
  const [maxActionHeight, setMaxActionHeight] = useState(0);
  const [consoleLogsExpanded, setConsoleLogsExpanded] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Group messages into pages
  const pages = useMemo(() => {
    const result: KlausMessage[][] = [];
    let currentPage: KlausMessage[] = [];
    
    messages.forEach((message) => {
      if (message.say === "browser_action_launch") {
        if (currentPage.length > 0) {
          result.push([...currentPage]);
        }
        currentPage = [message];
      } else {
        currentPage.push(message);
      }
    });
    
    if (currentPage.length > 0) {
      result.push(currentPage);
    }
    
    return result;
  }, [messages]);
  
  // Get current page
  const currentPage = pages[currentPageIndex] || [];
  
  // Determine if browser is currently being used
  const isBrowsing = useMemo(() => {
    const lastMessage = currentPage[currentPage.length - 1];
    return lastMessage?.say !== "browser_action_result" && lastMessage?.say !== "browser_action";
  }, [currentPage]);
  
  // Check if auto-approved
  const isAutoApproved = useMemo(() => {
    const launchMessage = currentPage.find((m) => m.say === "browser_action_launch");
    return !!launchMessage;
  }, [currentPage]);
  
  // Check if last message is resume
  const isLastMessageResume = useMemo(() => {
    const lastMessage = currentPage[currentPage.length - 1];
    return lastMessage?.ask === "resume_task";
  }, [currentPage]);
  
  // Get display state
  const displayState = useMemo(() => {
    let url = "";
    let screenshot = "";
    let consoleLogs = "";
    let mousePosition = "";
    
    for (const message of currentPage) {
      if (message.say === "browser_action_launch" && message.text) {
        const browserAction = JSON.parse(message.text) as KlausSayBrowserAction;
        // For launch action, the URL is likely in the text property
        if (browserAction.action === "launch") {
          // The URL might be in the message.text or in browserAction.text
          url = message.text || "";
        }
      } else if (message.say === "browser_action" && message.text) {
        const browserAction = JSON.parse(message.text) as KlausSayBrowserAction;
        // For launch action, the URL is likely in the text property
        if (browserAction.action === "launch") {
          // The URL might be in the message.text or in browserAction.text
          url = message.text || "";
        } else if (browserAction.coordinate) {
          mousePosition = browserAction.coordinate;
        }
      } else if (message.say === "browser_action_result" && message.text) {
        const result = JSON.parse(message.text) as BrowserActionResult;
        if (result.screenshot) {
          screenshot = result.screenshot;
        }
        if (result.logs) {
          consoleLogs = result.logs;
        }
        if (result.currentUrl) {
          url = result.currentUrl;
        }
        if (result.currentMousePosition) {
          mousePosition = result.currentMousePosition;
        }
      }
    }
    
    return { url, screenshot, consoleLogs, mousePosition };
  }, [currentPage]);
  
  // Calculate maxWidth
  const maxWidth = browserSettings.viewport.width < BROWSER_VIEWPORT_PRESETS["Small Desktop (900x600)"].width ? 200 : undefined;

  const [browserSessionRow, { height }] = useSize(
    <BrowserSessionRowContainer style={{ marginBottom: -10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        {isBrowsing && !isLastMessageResume ? (
          <ProgressIndicator />
        ) : (
          <span className="codicon codicon-inspect" style={{ color: "var(--vscode-foreground)" }}></span>
        )}
        <span style={{ fontWeight: "bold" }}>
          <>{isAutoApproved ? "Klaus is using the browser:" : "Klaus wants to use the browser:"}</>
        </span>
      </div>
      <BrowserWindowContainer maxWidth={maxWidth}>
        <BrowserToolbar>
          <BrowserUrlBar>
            {displayState.url || "http"}
          </BrowserUrlBar>
          <BrowserSettingsMenu />
        </BrowserToolbar>
        
        <BrowserScreenshotArea ratio={(browserSettings.viewport.height / browserSettings.viewport.width) * 100}>
          {displayState.screenshot ? (
            <BrowserScreenshot
              src={displayState.screenshot}
              alt="Browser screenshot"
              onClick={() =>
                vscode.postMessage({
                  type: "openImage",
                  text: displayState.screenshot,
                })
              }
            />
          ) : (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }}>
              <span className="codicon codicon-globe" style={{ fontSize: "80px", color: "var(--vscode-descriptionForeground)" }} />
            </div>
          )}
          {displayState.mousePosition && (
            <BrowserCursor
              style={{
                position: "absolute",
                top: `${(parseInt(displayState.mousePosition.split(",")[1]) / browserSettings.viewport.height) * 100}%`,
                left: `${(parseInt(displayState.mousePosition.split(",")[0]) / browserSettings.viewport.width) * 100}%`,
                transition: "top 0.3s ease-out, left 0.3s ease-out",
              }}
            />
          )}
        </BrowserScreenshotArea>

        <div style={{ width: "100%" }}>
          <div
            onClick={() => {
              setConsoleLogsExpanded(!consoleLogsExpanded);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              justifyContent: "flex-start",
              cursor: "pointer",
              padding: `9px 8px ${consoleLogsExpanded ? 0 : 8}px 8px`,
            }}>
            <span className={`codicon codicon-chevron-${consoleLogsExpanded ? "down" : "right"}`}></span>
            <span style={{ fontSize: "0.8em" }}>Console Logs</span>
          </div>
          {consoleLogsExpanded && (
            <CodeBlock source={`${"```"}shell\n${displayState.consoleLogs || "(No new logs)"}\n${"```"}`} />
          )}
        </div>
      </BrowserWindowContainer>

      {pages.length > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0px",
          marginTop: "15px",
          borderTop: "1px solid color-mix(in srgb, var(--vscode-editorGroup-border) 40%, transparent)",
        }}>
          <div>
            Step {currentPageIndex + 1} of {pages.length}
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <VSCodeButton
              disabled={currentPageIndex === 0 || isBrowsing}
              onClick={() => setCurrentPageIndex((i) => i - 1)}>
              Previous
            </VSCodeButton>
            <VSCodeButton
              disabled={currentPageIndex === pages.length - 1 || isBrowsing}
              onClick={() => setCurrentPageIndex((i) => i + 1)}>
              Next
            </VSCodeButton>
          </div>
        </div>
      )}
    </BrowserSessionRowContainer>
  );

  // Height change effect
  useEffect(() => {
    const isInitialRender = prevHeightRef.current === 0;
    if (isLast && height !== 0 && height !== Infinity && height !== prevHeightRef.current) {
      if (!isInitialRender) {
        onHeightChange(height > prevHeightRef.current);
      }
      prevHeightRef.current = height;
    }
  }, [height, isLast, onHeightChange]);

  return browserSessionRow;
}, deepEqual);

export default BrowserSessionRow;
