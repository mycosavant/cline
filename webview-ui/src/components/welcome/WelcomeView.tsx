import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useEffect, useState, memo } from "react";
import styled from "styled-components";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { validateApiConfiguration } from "../../utils/validate";
import { vscode } from "../../utils/vscode";
import { glassEffect } from "../../styles/glassmorphism";
import ApiOptions from "../settings/ApiOptions";
import KlausLogoCyan from "../../assets/KlausLogoCyan";

const WelcomeContainer = styled.div`
  position: fixed;
  inset: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const WelcomeContent = styled.div`
  height: 100%;
  padding: 0 20px;
  overflow: auto;
  
  h2 {
    margin-top: 15px;
    margin-bottom: 10px;
    font-size: 24px;
    font-weight: 500;
  }
  
  p {
    line-height: 1.5;
    margin-bottom: 15px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
`;

const Card = styled.div`
  ${glassEffect()}
  margin: 15px 0;
  padding: 20px;
  background: color-mix(in srgb, var(--vscode-editor-background) 80%, transparent);
  
  // Add subtle highlight on top edge
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

const WelcomeButton = styled(VSCodeButton)`
  width: 100%;
  margin-top: 8px;
  font-weight: 500 !important;
  padding: 10px !important;
  height: auto !important;
  
  &.primary {
    ${glassEffect()}
    background: color-mix(in srgb, var(--vscode-button-background) 80%, transparent) !important;
  }
  
  &.secondary {
    ${glassEffect()}
    background: color-mix(in srgb, var(--vscode-button-secondaryBackground) 80%, transparent) !important;
  }
`;

const WelcomeView = memo(() => {
  const { apiConfiguration } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined);
  const [showApiOptions, setShowApiOptions] = useState(false);

  const disableLetsGoButton = apiErrorMessage != null;

  const handleLogin = () => {
    vscode.postMessage({ type: "accountLoginClicked" });
  };

  const handleSubmit = () => {
    vscode.postMessage({ type: "apiConfiguration", apiConfiguration });
  };

  useEffect(() => {
    setApiErrorMessage(validateApiConfiguration(apiConfiguration));
  }, [apiConfiguration]);

  return (
    <WelcomeContainer>
      <WelcomeContent>
        <h2>Hi, I'm Klaus</h2>
        <LogoContainer>
          <KlausLogoCyan className="size-16" />
        </LogoContainer>
        <p>
          I can do all kinds of tasks thanks to breakthroughs in{" "}
          <VSCodeLink href="https://www.anthropic.com/claude/sonnet" className="inline">
            Claude 3.7 Sonnet's
          </VSCodeLink>{" "}
          agentic coding capabilities and access to tools that let me create & edit files, explore complex projects, use
          a browser, and execute terminal commands <i>(with your permission, of course)</i>. I can even use MCP to
          create new tools and extend my own capabilities.
        </p>

        <Card>
          <p style={{ color: "var(--vscode-descriptionForeground)" }}>
            Sign up for an account to get started for free, or use an API key that provides access to models like Claude
            3.7 Sonnet.
          </p>

          <WelcomeButton className="primary" onClick={handleLogin}>
            Get Started for Free
          </WelcomeButton>

          {!showApiOptions && (
            <WelcomeButton className="secondary" onClick={() => setShowApiOptions(!showApiOptions)}>
              Use your own API key
            </WelcomeButton>
          )}
        </Card>

        <div>
          {showApiOptions && (
            <div>
              <ApiOptions showModelOptions={false} />
              <WelcomeButton onClick={handleSubmit} disabled={disableLetsGoButton}>
                Let's go!
              </WelcomeButton>
            </div>
          )}
        </div>
      </WelcomeContent>
    </WelcomeContainer>
  );
});

export default WelcomeView;
