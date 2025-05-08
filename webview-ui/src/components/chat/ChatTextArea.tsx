import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import DynamicTextArea from "react-textarea-autosize"
import { useClickAway, useEvent, useWindowSize } from "react-use"
import styled from "styled-components"
import { mentionRegex, mentionRegexGlobal } from "../../../../src/shared/context-mentions"
import { ExtensionMessage } from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { glassEffect, GlassTextArea, GlassIconButton } from "../../styles/glassmorphism"
import {
	ContextMenuOptionType,
	getContextMenuOptions,
	insertMention,
	removeMention,
	shouldShowContextMenu,
} from "../../utils/context-mentions"
import { useMetaKeyDetection, useShortcut } from "../../utils/hooks"
import { validateApiConfiguration, validateModelId } from "../../utils/validate"
import { vscode } from "../../utils/vscode"
import { CODE_BLOCK_BG_COLOR } from "../common/CodeBlock"
import Thumbnails from "../common/Thumbnails"
import Tooltip from "../common/Tooltip"
import ApiOptions, { normalizeApiConfiguration } from "../settings/ApiOptions"
import { MAX_IMAGES_PER_MESSAGE } from "./ChatView"
import ContextMenu from "./ContextMenu"
import { ChatSettings } from "../../../../src/shared/ChatSettings"

interface ChatTextAreaProps {
	inputValue: string
	setInputValue: (value: string) => void
	textAreaDisabled: boolean
	placeholderText: string
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	onSend: () => void
	onSelectImages: () => void
	shouldDisableImages: boolean
	onHeightChange?: (height: number) => void
}

const PLAN_MODE_COLOR = "var(--vscode-inputValidation-warningBorder)"

// Custom styled components for glassmorphism
const ChatInputContainer = styled.div`
  ${glassEffect()}
  margin: 0 15px 15px;
  padding: 10px;
  position: relative;
  background: color-mix(in srgb, var(--vscode-editor-background) 70%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  
  // Subtle highlight on top
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent, 
      color-mix(in srgb, var(--vscode-focusBorder) 20%, transparent),
      transparent);
  }
`;

const TextAreaContainer = styled.div`
  position: relative;
  display: flex;
`;

const SwitchOption = styled.div<{ isActive: boolean }>`
	padding: 2px 8px;
	color: ${(props) => (props.isActive ? "white" : "var(--vscode-input-foreground)")};
	z-index: 1;
	transition: color 0.2s ease;
	font-size: 12px;
	width: 50%;
	text-align: center;
`;

const SwitchContainer = styled.div<{ disabled: boolean }>`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: var(--vscode-editor-background);
	border-radius: 4px;
	border: 1px solid var(--vscode-input-border);
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
	overflow: hidden;
	width: 100px;
	height: 24px;
`;

const Slider = styled.div<{ isAct: boolean; isPlan: boolean }>`
	position: absolute;
	top: 0;
	left: ${(props) => (props.isAct ? "50%" : "0")};
	width: 50%;
	height: 100%;
	background-color: ${(props) =>
		props.isAct ? "var(--vscode-button-background)" : props.isPlan ? PLAN_MODE_COLOR : "transparent"};
	transition: left 0.2s ease, background-color 0.2s ease;
	z-index: 0;
`;

const ControlsContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 15px 10px;
`;

const ButtonGroup = styled.div`
	display: flex;
	gap: 8px;
	align-items: center;
`;

const ModelContainer = styled.div`
	position: relative;
	margin-left: 8px;
`;

const ModelButtonWrapper = styled.div`
	position: relative;
`;

const ModelDisplayButton = styled.div<{ isActive: boolean; disabled: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2px 8px;
	border-radius: 4px;
	background-color: ${(props) =>
		props.isActive ? "var(--vscode-button-secondaryBackground)" : "var(--vscode-editor-background)"};
	border: 1px solid var(--vscode-input-border);
	color: var(--vscode-input-foreground);
	font-size: 12px;
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
	transition: background-color 0.2s ease;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 150px;

	&:hover {
		background-color: ${(props) =>
			props.disabled
				? props.isActive
					? "var(--vscode-button-secondaryBackground)"
					: "var(--vscode-editor-background)"
				: "var(--vscode-button-secondaryHoverBackground)"};
	}
`;

const ModelButtonContent = styled.div`
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 140px;
`;

const ModelSelectorTooltip = styled.div<{ arrowPosition: number; menuPosition: number }>`
	position: fixed;
	left: ${(props) => props.arrowPosition - 150}px;
	width: 300px;
	background-color: var(--vscode-editor-background);
	border: 1px solid var(--vscode-input-border);
	border-radius: 4px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	z-index: 1000;
	padding: 8px;
	max-height: 400px;
	overflow-y: auto;

	&::before {
		content: "";
		position: absolute;
		bottom: -8px;
		left: ${(props) => props.arrowPosition - (props.arrowPosition - 150)}px;
		width: 14px;
		height: 14px;
		background-color: var(--vscode-editor-background);
		border-right: 1px solid var(--vscode-input-border);
		border-bottom: 1px solid var(--vscode-input-border);
		transform: rotate(45deg);
		z-index: -1;
	}
`;

const ChatTextArea = forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(
	(
		{
			inputValue,
			setInputValue,
			textAreaDisabled,
			placeholderText,
			selectedImages,
			setSelectedImages,
			onSend,
			onSelectImages,
			shouldDisableImages,
			onHeightChange,
		},
		ref
	) => {
		// State and refs
		const { chatSettings, apiConfiguration } = useExtensionState();
		const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
		const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
		const [textAreaBaseHeight, setTextAreaBaseHeight] = useState<number | undefined>(undefined);
		const [thumbnailsHeight, setThumbnailsHeight] = useState(0);
		const [showModelSelector, setShowModelSelector] = useState(false);
		const [menuPosition, setMenuPosition] = useState(0);
		const [arrowPosition, setArrowPosition] = useState(0);
		const buttonRef = useRef<HTMLDivElement>(null);
		const modelSelectorRef = useRef<HTMLDivElement>(null);
		const highlightLayerRef = useRef<HTMLDivElement>(null);
		const contextMenuContainerRef = useRef<HTMLDivElement>(null);
		const { width: windowWidth } = useWindowSize();
		const { platform } = useExtensionState();
		const [os, metaKeyChar] = useMetaKeyDetection(platform);
		const [shownTooltipMode, setShownTooltipMode] = useState<"act" | "plan" | null>(null);
		
		// Simplified implementation for this example
		const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setInputValue(e.target.value);
		};
		
		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey && !textAreaDisabled) {
				e.preventDefault();
				onSend();
			}
		};
		
		const handleBlur = () => {
			setIsTextAreaFocused(false);
		};
		
		const handleKeyUp = () => {
			// Implementation would go here
		};
		
		const handlePaste = () => {
			// Implementation would go here
		};
		
		const updateCursorPosition = () => {
			// Implementation would go here
		};
		
		const updateHighlights = () => {
			// Implementation would go here
		};
		
		const handleThumbnailsHeightChange = (height: number) => {
			setThumbnailsHeight(height);
		};
		
		const handleModelButtonClick = () => {
			setShowModelSelector(!showModelSelector);
			
			if (buttonRef.current) {
				const rect = buttonRef.current.getBoundingClientRect();
				setMenuPosition(rect.top);
				setArrowPosition(rect.left + rect.width / 2);
			}
		};
		
		const handleContextButtonClick = () => {
			// Implementation would go here
		};
		
		const handleMenuMouseOnDown = () => {
			// Implementation would go here
		};
		
		const handleMentionSelect = () => {
			// Implementation would go here
		};
		
		const onModeToggle = () => {
			// Implementation would go here
		};
		
		// Close model selector when clicking outside
		useClickAway(modelSelectorRef, () => {
			setShowModelSelector(false);
		});
		
		// Get model display name
		const modelDisplayName = useMemo(() => {
			if (!apiConfiguration) return "Select Model";
			
			const apiProvider = apiConfiguration.apiProvider;
			
			if (apiProvider === "openrouter" && apiConfiguration.openRouterModelId) {
				return apiConfiguration.openRouterModelId.split("/").pop() || apiConfiguration.openRouterModelId;
			}
			
			if (apiProvider === "anthropic" && apiConfiguration.apiModelId) {
				return apiConfiguration.apiModelId;
			}
			
			return apiProvider || "Select Model";
		}, [apiConfiguration]);
		
		// Context menu state (simplified)
		const [showContextMenu, setShowContextMenu] = useState(false);
		const [searchQuery, setSearchQuery] = useState("");
		const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
		const [selectedType, setSelectedType] = useState<ContextMenuOptionType>(ContextMenuOptionType.File);
		const [queryItems, setQueryItems] = useState<any[]>([]);
		const [fileSearchResults, setFileSearchResults] = useState<any[]>([]);
		const [searchLoading, setSearchLoading] = useState(false);

		return (
			<div>
				<ChatInputContainer style={{ opacity: textAreaDisabled ? 0.5 : 1 }}>
					{showContextMenu && (
						<div ref={contextMenuContainerRef}>
							<ContextMenu
								onSelect={handleMentionSelect}
								searchQuery={searchQuery}
								onMouseDown={handleMenuMouseOnDown}
								selectedIndex={selectedMenuIndex}
								setSelectedIndex={setSelectedMenuIndex}
								selectedType={selectedType}
								queryItems={queryItems}
								// Removed properties not in the ContextMenuProps interface
							/>
						</div>
					)}
					<TextAreaContainer>
						<div
							ref={highlightLayerRef}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								pointerEvents: "none",
								whiteSpace: "pre-wrap",
								wordWrap: "break-word",
								color: "transparent",
								overflow: "hidden",
								backgroundColor: "transparent",
								fontFamily: "var(--vscode-font-family)",
								fontSize: "var(--vscode-editor-font-size)",
								lineHeight: "var(--vscode-editor-line-height)",
								padding: "9px 28px 3px 9px",
								borderBottom: `${thumbnailsHeight + 6}px solid transparent`,
							}}
						/>
						<GlassTextArea
							data-testid="chat-input"
							ref={(el) => {
								if (typeof ref === "function") {
									ref(el);
								} else if (ref) {
									ref.current = el;
								}
								textAreaRef.current = el;
							}}
							value={inputValue}
							disabled={textAreaDisabled}
							onChange={(e) => {
								handleInputChange(e);
								updateHighlights();
							}}
							onKeyDown={handleKeyDown}
							onKeyUp={handleKeyUp}
							onFocus={() => setIsTextAreaFocused(true)}
							onBlur={handleBlur}
							onPaste={handlePaste}
							onSelect={updateCursorPosition}
							onMouseUp={updateCursorPosition}
							onHeightChange={(height) => {
								if (textAreaBaseHeight === undefined || height < textAreaBaseHeight) {
									setTextAreaBaseHeight(height);
								}
								onHeightChange?.(height);
							}}
							placeholder={placeholderText}
							maxRows={10}
							autoFocus={true}
							style={{
								width: "100%",
								boxSizing: "border-box",
								backgroundColor: "transparent",
								color: "var(--vscode-input-foreground)",
								borderRadius: 10,
								resize: "none",
								overflowX: "hidden",
								overflowY: "scroll",
								scrollbarWidth: "none",
								border: "none",
								padding: "14px 50px 14px 14px",
								cursor: textAreaDisabled ? "not-allowed" : undefined,
								flex: 1,
								zIndex: 1,
								outline: isTextAreaFocused
									? `1px solid ${chatSettings.mode === "plan" ? PLAN_MODE_COLOR : "var(--vscode-focusBorder)"}`
									: "none",
							}}
							onScroll={() => updateHighlights()}
						/>
						{selectedImages.length > 0 && (
							<Thumbnails
								images={selectedImages}
								setImages={setSelectedImages}
								onHeightChange={handleThumbnailsHeightChange}
								style={{
									position: "absolute",
									paddingTop: 4,
									bottom: 14,
									left: 22,
									right: 47,
									zIndex: 2,
								}}
							/>
						)}
						<div
							style={{
								position: "absolute",
								right: 23,
								display: "flex",
								alignItems: "flex-center",
								height: textAreaBaseHeight || 31,
								bottom: 9.5,
								zIndex: 2,
							}}>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
								}}>
								<GlassIconButton
									data-testid="send-button"
									className={`${textAreaDisabled ? "disabled" : ""}`}
									onClick={() => {
										if (!textAreaDisabled) {
											setIsTextAreaFocused(false);
											onSend();
										}
									}}
									style={{ width: 36, height: 36 }}>
									<span className="codicon codicon-send" style={{ fontSize: 15 }}></span>
								</GlassIconButton>
							</div>
						</div>
					</TextAreaContainer>
				</ChatInputContainer>

				<ControlsContainer>
					<ButtonGroup>
						<GlassIconButton
							data-testid="context-button"
							aria-label="Add Context"
							onClick={handleContextButtonClick}
							style={{
								width: 28,
								height: 28,
								opacity: textAreaDisabled ? 0.5 : 1,
								pointerEvents: textAreaDisabled ? 'none' : 'auto'
							}}>
							<span style={{ fontSize: "13px", marginBottom: 1 }}>@</span>
						</GlassIconButton>

						<GlassIconButton
							data-testid="images-button"
							aria-label="Add Images"
							onClick={() => {
								if (!shouldDisableImages) {
									onSelectImages();
								}
							}}
							style={{
								width: 28,
								height: 28,
								opacity: shouldDisableImages ? 0.5 : 1,
								pointerEvents: shouldDisableImages ? 'none' : 'auto'
							}}>
							<span
								className="codicon codicon-device-camera"
								style={{ fontSize: "14px", marginBottom: -3 }}
							/>
						</GlassIconButton>

						<ModelContainer ref={modelSelectorRef}>
							<ModelButtonWrapper ref={buttonRef}>
								<ModelDisplayButton
									role="button"
									isActive={showModelSelector}
									disabled={false}
									onClick={handleModelButtonClick}
									tabIndex={0}>
									<ModelButtonContent>{modelDisplayName}</ModelButtonContent>
								</ModelDisplayButton>
							</ModelButtonWrapper>
							{showModelSelector && (
								<ModelSelectorTooltip
									arrowPosition={arrowPosition}
									menuPosition={menuPosition}
									style={{
										bottom: `calc(100vh - ${menuPosition}px + 6px)`,
									}}>
									<ApiOptions
										showModelOptions={true}
										apiErrorMessage={undefined}
										modelIdErrorMessage={undefined}
										isPopup={true}
									/>
								</ModelSelectorTooltip>
							)}
						</ModelContainer>
					</ButtonGroup>
					<Tooltip
						style={{ zIndex: 1000 }}
						visible={shownTooltipMode !== null}
						tipText={`In ${shownTooltipMode === "act" ? "Act" : "Plan"}  mode, Klaus will ${shownTooltipMode === "act" ? "complete the task immediately" : "gather information to architect a plan"}`}
						hintText={`Toggle w/ ${metaKeyChar}+Shift+A`}>
						<SwitchContainer data-testid="mode-switch" disabled={false} onClick={onModeToggle}>
							<Slider isAct={chatSettings.mode === "act"} isPlan={chatSettings.mode === "plan"} />
							<SwitchOption
								isActive={chatSettings.mode === "plan"}
								onMouseOver={() => setShownTooltipMode("plan")}
								onMouseLeave={() => setShownTooltipMode(null)}>
								Plan
							</SwitchOption>
							<SwitchOption
								isActive={chatSettings.mode === "act"}
								onMouseOver={() => setShownTooltipMode("act")}
								onMouseLeave={() => setShownTooltipMode(null)}>
								Act
							</SwitchOption>
						</SwitchContainer>
					</Tooltip>
				</ControlsContainer>
			</div>
		);
	}
);

export default ChatTextArea;
