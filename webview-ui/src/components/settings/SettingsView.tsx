import { VSCodeButton, VSCodeCheckbox, VSCodeLink, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import { memo, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { validateApiConfiguration, validateModelId } from "../../utils/validate";
import { vscode } from "../../utils/vscode";
import { glassEffect } from "../../styles/glassmorphism";
import SettingsButton from "../common/SettingsButton";
import ApiOptions from "./ApiOptions";
import { useEvent } from "react-use";
import { ExtensionMessage } from "../../../../src/shared/ExtensionMessage";

// Simple TabButton component since we can't find the original
const TabButton = styled.button<{ isActive: boolean }>`
  padding: 8px 16px;
  background: ${props => props.isActive ? 'var(--vscode-button-background)' : 'transparent'};
  color: ${props => props.isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
  border: none;
  border-bottom: 2px solid ${props => props.isActive ? 'var(--vscode-button-background)' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.isActive ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-list-hoverBackground)'};
  }
`;

const { IS_DEV } = process.env;

type SettingsViewProps = {
  onDone: () => void;
};

const SettingsContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 0 0 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-right: 20px;
  
  h3 {
    margin: 0;
    color: var(--vscode-foreground);
  }
`;

const SettingsContent = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 15px;
  display: flex;
  flex-direction: column;
`;

const SettingsCard = styled.div`
  ${glassEffect()}
  margin-bottom: 15px;
  padding: 15px;
  background: color-mix(in srgb, var(--vscode-panel-background) 85%, transparent);
  
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

const TabsContainer = styled.div`
  display: flex;
  gap: 1px;
  margin-bottom: 15px;
  border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
`;

const FooterText = styled.div`
  text-align: center;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
  line-height: 1.2;
  margin-top: auto;
  padding: 0 0 15px 0;
`;

const FooterLink = styled(VSCodeLink)`
  display: inline !important;
  font-size: inherit !important;
`;

const SettingsView = ({ onDone }: SettingsViewProps) => {
  const {
    apiConfiguration,
    version,
    customInstructions,
    setCustomInstructions,
    openRouterModels,
    telemetrySetting,
    setTelemetrySetting,
    chatSettings,
    planActSeparateModelsSetting,
    setPlanActSeparateModelsSetting,
  } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined);
  const [modelIdErrorMessage, setModelIdErrorMessage] = useState<string | undefined>(undefined);
  const [pendingTabChange, setPendingTabChange] = useState<"plan" | "act" | null>(null);

  const handleSubmit = useCallback(
    (shouldValidate: boolean) => {
      if (shouldValidate) {
        const apiError = validateApiConfiguration(apiConfiguration);
        setApiErrorMessage(apiError);
        if (apiError) {
          return;
        }

        const modelIdError = validateModelId(apiConfiguration);
        setModelIdErrorMessage(modelIdError);
        if (modelIdError) {
          return;
        }
      }

      vscode.postMessage({ type: "apiConfiguration", apiConfiguration });
      onDone();
    },
    [apiConfiguration, onDone]
  );

  const handleResetState = useCallback(() => {
    vscode.postMessage({ type: "resetState" });
  }, []);

  const handleTabChange = useCallback(
    (tab: "plan" | "act") => {
      if (chatSettings.mode === tab) {
        return;
      }

      if (apiErrorMessage || modelIdErrorMessage) {
        setPendingTabChange(tab);
        return;
      }

      // Using apiConfiguration message type instead of chatSettings
      vscode.postMessage({
        type: "apiConfiguration",
        apiConfiguration: {
          ...apiConfiguration,
          // Store the mode in a custom property
          chatMode: tab
        },
      });
    },
    [apiErrorMessage, chatSettings, modelIdErrorMessage]
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.type === "didUpdateSettings") {
        if (pendingTabChange) {
          handleTabChange(pendingTabChange);
          setPendingTabChange(null);
        }
      }
    },
    [handleTabChange, pendingTabChange]
  );

  useEvent("message", handleMessage);

  useEffect(() => {
    setApiErrorMessage(validateApiConfiguration(apiConfiguration));
    setModelIdErrorMessage(validateModelId(apiConfiguration));
  }, [apiConfiguration]);

  return (
    <SettingsContainer>
      <SettingsHeader>
        <h3>Settings</h3>
        <VSCodeButton onClick={() => handleSubmit(false)}>Done</VSCodeButton>
      </SettingsHeader>
      
      <SettingsContent>
        {planActSeparateModelsSetting ? (
          <SettingsCard>
            <TabsContainer>
              <TabButton isActive={chatSettings.mode === "plan"} onClick={() => handleTabChange("plan")}>
                Plan Mode
              </TabButton>
              <TabButton isActive={chatSettings.mode === "act"} onClick={() => handleTabChange("act")}>
                Act Mode
              </TabButton>
            </TabsContainer>

            <div style={{ marginBottom: -10 }}>
              <ApiOptions
                key={chatSettings.mode}
                showModelOptions={true}
                apiErrorMessage={apiErrorMessage}
                modelIdErrorMessage={modelIdErrorMessage}
              />
            </div>
          </SettingsCard>
        ) : (
          <ApiOptions
            key={"single"}
            showModelOptions={true}
            apiErrorMessage={apiErrorMessage}
            modelIdErrorMessage={modelIdErrorMessage}
          />
        )}

        <div className="mb-[5px]">
          <VSCodeTextArea
            value={customInstructions ?? ""}
            className="w-full"
            resize="vertical"
            rows={4}
            placeholder={'e.g. "Run unit tests at the end", "Use TypeScript with async/await", "Speak in Spanish"'}
            onInput={(e: any) => setCustomInstructions(e.target?.value ?? "")}>
            <span className="font-medium">Custom Instructions</span>
          </VSCodeTextArea>
          <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
            These instructions are added to the end of the system prompt sent with every request.
          </p>
        </div>

        <div className="mb-[5px]">
          <VSCodeCheckbox
            className="mb-[5px]"
            checked={planActSeparateModelsSetting}
            onChange={(e: any) => {
              const checked = e.target.checked === true;
              setPlanActSeparateModelsSetting(checked);
            }}>
            Use different models for Plan and Act modes
          </VSCodeCheckbox>
          <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
            Switching between Plan and Act mode will persist the API and model used in the previous mode. This may be
            helpful e.g. when using a strong reasoning model to architect a plan for a cheaper coding model to act on.
          </p>
        </div>

        <div className="mb-[5px]">
          <VSCodeCheckbox
            className="mb-[5px]"
            checked={telemetrySetting === "enabled"}
            onChange={(e: any) => {
              const checked = e.target.checked === true;
              setTelemetrySetting(checked ? "enabled" : "disabled");
            }}>
            Allow anonymous error and usage reporting
          </VSCodeCheckbox>
          <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
            Help improve Klaus by sending anonymous usage data and error reports. No code, prompts, or personal
            information are ever sent. See our{" "}
            <FooterLink href="https://docs.klaus.bot/more-info/telemetry">
              telemetry overview
            </FooterLink>{" "}
            and{" "}
            <FooterLink href="https://klaus.bot/privacy">
              privacy policy
            </FooterLink>{" "}
            for more details.
          </p>
        </div>

        {/* Browser Settings Section removed since it doesn't exist */}

        <div className="mt-auto pr-2 flex justify-center">
          <SettingsButton
            onClick={() => vscode.postMessage({ type: "openExtensionSettings" })}
            className="mt-0 mr-0 mb-4 ml-0">
            <i className="codicon codicon-settings-gear" />
            Advanced Settings
          </SettingsButton>
        </div>

        {IS_DEV && (
          <>
            <div className="mt-[10px] mb-1">Debug</div>
            <VSCodeButton onClick={handleResetState} className="mt-[5px] w-auto">
              Reset State
            </VSCodeButton>
            <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
              This will reset all global state and secret storage in the extension.
            </p>
          </>
        )}

        <FooterText>
          <p>
            If you have any questions or feedback, feel free to open an issue at{" "}
            <FooterLink href="https://github.com/klaus/klaus">
              https://github.com/klaus/klaus
            </FooterLink>
          </p>
          <p style={{ fontStyle: "italic", marginTop: 10 }}>v{version}</p>
        </FooterText>
      </SettingsContent>
    </SettingsContainer>
  );
};

export default memo(SettingsView);
