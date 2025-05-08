import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { glassEffect, hoverEffect } from "../../styles/glassmorphism";
import styled from "styled-components";

interface SuccessButtonProps extends React.ComponentProps<typeof VSCodeButton> {}

const StyledSuccessButton = styled(VSCodeButton)`
  ${glassEffect()}
  ${hoverEffect}
  background: color-mix(in srgb, #176f2c 80%, transparent) !important;
  border: 1px solid color-mix(in srgb, #176f2c 50%, transparent) !important;
  color: white !important;
  border-radius: 8px !important;
  transition: all 0.2s ease;
  
  &:hover {
    background: color-mix(in srgb, #197f31 90%, transparent) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    background: color-mix(in srgb, #156528 90%, transparent) !important;
    transform: translateY(0);
  }
`;

const SuccessButton: React.FC<SuccessButtonProps> = (props) => {
  return <StyledSuccessButton {...props} />;
};

export default SuccessButton;
