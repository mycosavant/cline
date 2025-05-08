import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { CSSProperties, memo } from "react";
import styled from "styled-components";
import { getAsVar, VSC_DESCRIPTION_FOREGROUND, VSC_INACTIVE_SELECTION_BACKGROUND } from "../../utils/vscStyles";
import { glassEffect } from "../../styles/glassmorphism";

interface AnnouncementProps {
  version: string;
  hideAnnouncement: () => void;
}

const AnnouncementContainer = styled.div`
  ${glassEffect()}
  background-color: color-mix(in srgb, ${getAsVar(VSC_INACTIVE_SELECTION_BACKGROUND)} 90%, transparent);
  padding: 15px 18px;
  margin: 8px 15px;
  position: relative;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
  
  // Subtle highlight on top edge
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent, 
      color-mix(in srgb, var(--vscode-focusBorder) 15%, transparent),
      transparent);
  }
`;

const CloseButton = styled(VSCodeButton)`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px !important;
  background: transparent !important;
  border: none !important;
  
  &:hover {
    background: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 50%, transparent) !important;
  }
`;

const Title = styled.h3`
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Feature = styled.li`
  margin-bottom: 8px;
  
  b {
    font-weight: 600;
  }
`;

const FeatureList = styled.ul`
  margin: 0 0 10px;
  padding-left: 16px;
`;

const Divider = styled.div`
  height: 1px;
  background: color-mix(in srgb, ${getAsVar(VSC_DESCRIPTION_FOREGROUND)} 10%, transparent);
  margin: 10px 0;
`;

const LinkContainer = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Announcement = ({ version, hideAnnouncement }: AnnouncementProps) => {
  const minorVersion = version.split(".").slice(0, 2).join(".");
  
  return (
    <AnnouncementContainer>
      <CloseButton appearance="icon" onClick={hideAnnouncement}>
        <span className="codicon codicon-close"></span>
      </CloseButton>
      
      <Title>
        <span role="img" aria-label="celebration">🎉</span>
        <span>New in v{minorVersion}</span>
      </Title>
      
      <FeatureList>
        <Feature>
          <b>Model Favorites:</b> You can now mark your favorite models when using Klaus & OpenRouter providers for
          quick access!
        </Feature>
        <Feature>
          <b>Faster Diff Editing:</b> Improved animation performance for large files, plus a new indicator in chat
          showing the number of edits Klaus makes.
        </Feature>
        <Feature>
          <b>New Auto-Approve Options:</b> Turn off Klaus's ability to read and edit files outside your workspace.
        </Feature>
      </FeatureList>
      
      <h4 style={{ margin: "12px 0 8px" }}>Previous Updates:</h4>

      <FeatureList>
        <Feature>
          <b>Browser Tool Upgrades:</b> Use your local Chrome browser for session-based browsing, enabling debugging and
          productivity workflows tied to your actual browser state.
        </Feature>
        <Feature>
          <b>Auto-Approve Commands:</b> New option to automatically approve <b>ALL</b> commands (use at your own risk!)
        </Feature>
        <Feature>
          <b>Easily Toggle MCP's:</b> New popover in the chat area to easily enable/disable MCP servers.
        </Feature>
      </FeatureList>
      
      <Divider />
      
      <LinkContainer>
        Join us on{" "}
        <VSCodeLink href="https://x.com/klaus">
          X,
        </VSCodeLink>{" "}
        <VSCodeLink href="https://discord.gg/klaus">
          discord,
        </VSCodeLink>{" "}
        or{" "}
        <VSCodeLink href="https://www.reddit.com/r/klaus/">
          r/klaus
        </VSCodeLink>
        for more updates!
      </LinkContainer>
    </AnnouncementContainer>
  );
};

export default memo(Announcement);
