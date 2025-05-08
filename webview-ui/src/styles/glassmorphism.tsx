import styled, { css } from 'styled-components';
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import DynamicTextArea from "react-textarea-autosize";

// Core glassmorphism mixins and variables
export const glassEffect = css<{$opacity?: number, $blur?: number}>`
  background: color-mix(in srgb, var(--vscode-editor-background) ${props => props.$opacity || 75}%, transparent);
  backdrop-filter: blur(${props => props.$blur || 8}px);
  -webkit-backdrop-filter: blur(${props => props.$blur || 8}px);
  border-radius: var(--glass-radius, 8px);
  border: 1px solid var(--glass-border-color, color-mix(in srgb, var(--vscode-input-border) 50%, transparent));
  box-shadow: var(--glass-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  
  @supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
    /* Fallback for browsers without backdrop-filter support */
    background: var(--vscode-editor-background);
    opacity: 0.95;
  }
`;

export const subtleAnimation = css`
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease;
`;

export const hoverEffect = css`
  ${subtleAnimation}
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// Base components with glassmorphism
export const GlassPanel = styled.div<{$opacity?: number, $blur?: number}>`
  ${props => glassEffect({$opacity: props.$opacity, $blur: props.$blur})}
  padding: 16px;
`;

export const GlassButton = styled(VSCodeButton)`
  ${glassEffect}
  ${hoverEffect}
  background: color-mix(in srgb, var(--vscode-button-background) 80%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--vscode-button-border) 50%, transparent) !important;
  border-radius: 8px !important;
  
  &:hover {
    background: color-mix(in srgb, var(--vscode-button-hoverBackground) 90%, transparent) !important;
  }
`;

export const GlassTextField = styled(VSCodeTextField)`
  ::part(control) {
    ${glassEffect}
    background: color-mix(in srgb, var(--vscode-input-background) 70%, transparent) !important;
  }
  
  ::part(input) {
    background: transparent !important;
  }
`;

export const GlassDropdown = styled(VSCodeDropdown)`
  ::part(control) {
    ${glassEffect}
    background: color-mix(in srgb, var(--vscode-dropdown-background) 80%, transparent) !important;
  }
  
  ::part(listbox) {
    ${glassEffect}
    background: color-mix(in srgb, var(--vscode-dropdown-background) 90%, transparent) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
    border-radius: 8px !important;
    overflow: hidden !important;
  }
`;

export const GlassTextArea = styled(DynamicTextArea)`
  ${glassEffect}
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  color: var(--vscode-input-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-editor-font-size);
  line-height: var(--vscode-editor-line-height);
  resize: none;
  overflow-x: hidden;
  overflow-y: scroll;
  scrollbar-width: none;
  border: none;
  padding: 14px;
  outline: none;
  
  &:focus {
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }
  
  &::placeholder {
    color: color-mix(in srgb, var(--vscode-input-placeholderForeground) 90%, transparent);
  }
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

export const GlassIconButton = styled.div`
  ${glassEffect}
  ${hoverEffect}
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  
  .codicon {
    font-size: 16px;
    color: var(--vscode-foreground);
  }
`;

export const GlassCheckbox = styled(VSCodeCheckbox)`
  ::part(control) {
    ${glassEffect}
    background: color-mix(in srgb, var(--vscode-checkbox-background) 80%, transparent) !important;
  }
`;

// kjbjb




