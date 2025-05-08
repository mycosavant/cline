import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { memo, useState } from "react";
import styled from "styled-components";
import { glassEffect } from "../../styles/glassmorphism";
import { vscode } from "../../utils/vscode";
import { TelemetrySetting } from "../../../../src/shared/TelemetrySetting";

const BannerContainer = styled.div`
  ${glassEffect()}
  background-color: color-mix(in srgb, var(--vscode-banner-background) 90%, transparent);
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  margin-bottom: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  h3 {
    margin: 0;
    font-size: 15px;
  }
  
  p {
    margin: 8px 0 0;
    line-height: 1.4;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;

  & > vscode-button {
    flex: 1;
  }
`;

const TelemetryBanner = () => {
  const [hasChosen, setHasChosen] = useState(false);

  const handleAllow = () => {
    setHasChosen(true);
    vscode.postMessage({ type: "telemetrySetting", telemetrySetting: "enabled" satisfies TelemetrySetting });
  };

  const handleDeny = () => {
    setHasChosen(true);
    vscode.postMessage({ type: "telemetrySetting", telemetrySetting: "disabled" satisfies TelemetrySetting });
  };

  const handleOpenSettings = () => {
    vscode.postMessage({ type: "openSettings" });
  };

  return (
    <BannerContainer>
      <div>
        <h3>Help Improve Klaus</h3>
        <div>
          Send anonymous error and usage data to help us fix bugs and improve the extension. No code, prompts, or
          personal information is ever sent.
          <div style={{ marginTop: 4 }}>
            You can always change this in{" "}
            <VSCodeLink href="#" onClick={handleOpenSettings}>
              settings
            </VSCodeLink>
            .
          </div>
        </div>
      </div>
      <ButtonContainer>
        <VSCodeButton appearance="primary" onClick={handleAllow} disabled={hasChosen}>
          Allow
        </VSCodeButton>
        <VSCodeButton appearance="secondary" onClick={handleDeny} disabled={hasChosen}>
          Deny
        </VSCodeButton>
      </ButtonContainer>
    </BannerContainer>
  );
};

export default memo(TelemetryBanner);
