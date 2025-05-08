import {
    VSCodeButton,
    VSCodeLink,
    VSCodePanels,
    VSCodePanelTab,
    VSCodePanelView,
    VSCodeDropdown,
    VSCodeOption,
    VSCodeCheckbox,
} from "@vscode/webview-ui-toolkit/react"
import React, { useEffect, useState } from "react"
import styled from "styled-components"
import { DEFAULT_MCP_TIMEOUT_SECONDS, McpServer } from "../../../../src/shared/mcp"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { getMcpServerDisplayName } from "../../utils/mcp"
import { vscode } from "../../utils/vscode"
import McpMarketplaceView from "./marketplace/McpMarketplaceView"
import McpResourceRow from "./McpResourceRow"
import McpToolRow from "./McpToolRow"
import DangerButton from "../common/DangerButton"
import AddRemoteServerForm from "./tabs/AddRemoteServerForm"
import AddLocalServerForm from "./tabs/AddLocalServerForm"
import { glassEffect, hoverEffect, GlassButton, GlassPanel } from "../../styles/glassmorphism"

type McpViewProps = {
    onDone: () => void
}

const McpViewContainer = styled.div`
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--vscode-editor-background);
    
    // Light outer glass effect for the container
    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.05), 
            rgba(255, 255, 255, 0.03));
        pointer-events: none;
    }
`

const McpHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 17px 5px 20px;
    
    h3 {
        color: var(--vscode-foreground);
        margin: 0;
    }
`

const McpContent = styled.div`
    flex: 1;
    overflow: auto;
`

const TabsContainer = styled.div`
    display: flex;
    gap: 1px;
    padding: 0 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
`

const ContentContainer = styled.div`
    width: 100%;
`

const InfoText = styled.div`
    color: var(--vscode-foreground);
    font-size: 13px;
    margin-bottom: 16px;
    margin-top: 5px;
`

const ServerContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`

const EmptyStateContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    margin-bottom: 20px;
    color: var(--vscode-descriptionForeground);
`

const SettingsSection = styled.div`
    margin-bottom: 20px;
    margin-top: 10px;
`

const ServerRow = styled(GlassPanel)`
    margin-bottom: 10px;
    padding: 0;
    opacity: ${(props) => props.$disabled ? 0.6 : 1};
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
    }
`

const ServerHeader = styled.div<{$error?: boolean}>`
    display: flex;
    align-items: center;
    padding: 8px;
    background: var(--vscode-textCodeBlock-background);
    cursor: ${props => props.$error ? 'default' : 'pointer'};
    border-radius: ${props => props.$error || props.$isExpanded ? '4px 4px 0 0' : '4px'};
`

const ServerName = styled.span`
    flex: 1;
    overflow: hidden;
    word-break: break-all;
    white-space: normal;
    display: flex;
    align-items: center;
    margin-right: 4px;
`

const ServerControls = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
`

const ServerToggle = styled.div`
    display: flex;
    align-items: center;
    margin-left: 8px;
`

const StatusIndicator = styled.div<{$status: 'connected' | 'connecting' | 'disconnected'}>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
        switch (props.$status) {
            case 'connected':
                return 'var(--vscode-testing-iconPassed)';
            case 'connecting':
                return 'var(--vscode-charts-yellow)';
            case 'disconnected':
                return 'var(--vscode-testing-iconFailed)';
        }
    }};
    margin-left: 8px;
`

const ErrorContainer = styled.div`
    font-size: 13px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 0 0 4px 4px;
    width: 100%;
`

const ErrorMessage = styled.div`
    color: var(--vscode-testing-iconFailed);
    margin-bottom: 8px;
    padding: 0 10px;
    overflow-wrap: break-word;
    word-break: break-word;
`

const ToggleSwitch = styled.div<{$active: boolean}>`
    width: 20px;
    height: 10px;
    background-color: ${props => props.$active
        ? 'var(--vscode-testing-iconPassed)'
        : 'var(--vscode-titleBar-inactiveForeground)'};
    border-radius: 5px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s;
    opacity: ${props => props.$active ? 0.9 : 0.5};
`

const ToggleSwitchThumb = styled.div<{$active: boolean}>`
    width: 6px;
    height: 6px;
    background-color: white;
    border: 1px solid color-mix(in srgb, #666666 65%, transparent);
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: ${props => props.$active ? '12px' : '2px'};
    transition: left 0.2s;
`

const McpView = ({ onDone }: McpViewProps) => {
    const { mcpServers: servers, mcpMarketplaceEnabled } = useExtensionState()
    const [activeTab, setActiveTab] = useState(mcpMarketplaceEnabled ? "marketplace" : "installed")
    const [activeSubTab, setActiveSubTab] = useState("remote")

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
    }

    useEffect(() => {
        if (!mcpMarketplaceEnabled && activeTab === "marketplace") {
            // If marketplace is disabled and we're on marketplace tab, switch to installed
            setActiveTab("installed")
        }
    }, [mcpMarketplaceEnabled, activeTab])

    useEffect(() => {
        if (mcpMarketplaceEnabled) {
            vscode.postMessage({ type: "silentlyRefreshMcpMarketplace" })
            vscode.postMessage({ type: "fetchLatestMcpServersFromHub" })
        }
    }, [mcpMarketplaceEnabled])

    return (
        <McpViewContainer>
            <McpHeader>
                <h3>MCP Servers</h3>
                <GlassButton onClick={onDone}>Done</GlassButton>
            </McpHeader>

            <McpContent>
                {/* Tabs container */}
                <TabsContainer>
                    {mcpMarketplaceEnabled && (
                        <TabButton isActive={activeTab === "marketplace"} onClick={() => handleTabChange("marketplace")}>
                            Marketplace
                        </TabButton>
                    )}
                    <TabButton isActive={activeTab === "addRemote"} onClick={() => handleTabChange("addRemote")}>
                        Add Server
                    </TabButton>
                    <TabButton isActive={activeTab === "installed"} onClick={() => handleTabChange("installed")}>
                        Installed
                    </TabButton>
                </TabsContainer>

                {/* Content container */}
                <ContentContainer>
                    {mcpMarketplaceEnabled && activeTab === "marketplace" && <McpMarketplaceView />}
                    {activeTab === "addRemote" && (
                        <div style={{ padding: "5px 0 0 0" }}>
                            <TabsContainer>
                                <TabButton isActive={activeSubTab === "remote"} onClick={() => setActiveSubTab("remote")}>
                                    Remote (SSE)
                                </TabButton>
                                <TabButton isActive={activeSubTab === "local"} onClick={() => setActiveSubTab("local")}>
                                    Local (Command)
                                </TabButton>
                            </TabsContainer>

                            <div>
                                {activeSubTab === "remote" && (
                                    <AddRemoteServerForm onServerAdded={() => handleTabChange("installed")} />
                                )}
                                {activeSubTab === "local" && (
                                    <AddLocalServerForm onServerAdded={() => handleTabChange("installed")} />
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === "installed" && (
                        <div style={{ padding: "16px 20px" }}>
                            <InfoText>
                                The{" "}
                                <VSCodeLink href="https://github.com/modelcontextprotocol" style={{ display: "inline" }}>
                                    Model Context Protocol
                                </VSCodeLink>{" "}
                                enables communication with locally running MCP servers that provide additional tools and resources
                                to extend Klaus's capabilities. You can use{" "}
                                <VSCodeLink href="https://github.com/modelcontextprotocol/servers" style={{ display: "inline" }}>
                                    community-made servers
                                </VSCodeLink>{" "}
                                or ask Klaus to create new tools specific to your workflow (e.g., "add a tool that gets the latest
                                npm docs").{" "}
                                <VSCodeLink href="https://x.com/sdrzn/status/1867271665086074969" style={{ display: "inline" }}>
                                    See a demo here.
                                </VSCodeLink>
                            </InfoText>

                            {servers.length > 0 ? (
                                <ServerContainer>
                                    {servers.map((server) => (
                                        <ServerRow key={server.name} $disabled={server.disabled}>
                                            <ServerComponent server={server} />
                                        </ServerRow>
                                    ))}
                                </ServerContainer>
                            ) : (
                                <EmptyStateContainer>
                                    No MCP servers installed
                                </EmptyStateContainer>
                            )}

                            {/* Settings Section */}
                            <SettingsSection>
                                <GlassButton
                                    appearance="secondary"
                                    style={{ width: "100%", marginBottom: "5px" }}
                                    onClick={() => {
                                        vscode.postMessage({ type: "openMcpSettings" })
                                    }}>
                                    Edit Configuration
                                </GlassButton>

                                <div style={{ textAlign: "center" }}>
                                    <VSCodeLink
                                        onClick={() => {
                                            vscode.postMessage({
                                                type: "openExtensionSettings",
                                                text: "klaus.mcp",
                                            })
                                        }}
                                        style={{ fontSize: "12px" }}>
                                        Advanced MCP Settings
                                    </VSCodeLink>
                                </div>
                            </SettingsSection>
                        </div>
                    )}
                </ContentContainer>
            </McpContent>
        </McpViewContainer>
    )
}

// Server Component implementation
const ServerComponent = ({ server }: { server: McpServer }) => {
    const { mcpMarketplaceCatalog, autoApprovalSettings } = useExtensionState()

    const [isExpanded, setIsExpanded] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleRowClick = () => {
        if (!server.error) {
            setIsExpanded(!isExpanded)
        }
    }

    const [timeoutValue, setTimeoutValue] = useState<string>(() => {
        try {
            const config = JSON.parse(server.config)
            return config.timeout?.toString() || DEFAULT_MCP_TIMEOUT_SECONDS.toString()
        } catch {
            return DEFAULT_MCP_TIMEOUT_SECONDS.toString()
        }
    })

    const timeoutOptions = [
        { value: "30", label: "30 seconds" },
        { value: "60", label: "1 minute" },
        { value: "300", label: "5 minutes" },
        { value: "600", label: "10 minutes" },
        { value: "1800", label: "30 minutes" },
        { value: "3600", label: "1 hour" },
    ]

    const handleTimeoutChange = (e: any) => {
        const select = e.target as HTMLSelectElement
        const value = select.value
        const num = parseInt(value)
        setTimeoutValue(value)
        vscode.postMessage({
            type: "updateMcpTimeout",
            serverName: server.name,
            timeout: num,
        })
    }

    const handleRestart = () => {
        vscode.postMessage({
            type: "restartMcpServer",
            text: server.name,
        })
    }

    const handleDelete = () => {
        setIsDeleting(true)
        vscode.postMessage({
            type: "deleteMcpServer",
            serverName: server.name,
        })
    }

    const handleAutoApproveChange = () => {
        if (!server.name) return

        vscode.postMessage({
            type: "toggleToolAutoApprove",
            serverName: server.name,
            toolNames: server.tools?.map((tool) => tool.name) || [],
            autoApprove: !server.tools?.every((tool) => tool.autoApprove),
        })
    }

    return (
        <>
            <ServerHeader 
                $error={!!server.error} 
                $isExpanded={isExpanded}
                onClick={handleRowClick}
            >
                {!server.error && (
                    <span 
                        className={`codicon codicon-chevron-${isExpanded ? "down" : "right"}`} 
                        style={{ marginRight: "8px" }} 
                    />
                )}
                <ServerName>
                    {getMcpServerDisplayName(server.name, mcpMarketplaceCatalog)}
                </ServerName>
                
                {/* Collapsed view controls */}
                {!server.error && (
                    <ServerControls>
                        <VSCodeButton
                            appearance="icon"
                            title="Restart Server"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleRestart()
                            }}
                            disabled={server.status === "connecting"}>
                            <span className="codicon codicon-sync"></span>
                        </VSCodeButton>
                        <VSCodeButton
                            appearance="icon"
                            title="Delete Server"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDelete()
                            }}
                            disabled={isDeleting}>
                            <span className="codicon codicon-trash"></span>
                        </VSCodeButton>
                    </ServerControls>
                )}
                
                {/* Toggle Switch */}
                <ServerToggle onClick={(e) => e.stopPropagation()}>
                    <ToggleSwitch
                        $active={!server.disabled}
                        role="switch"
                        aria-checked={!server.disabled}
                        tabIndex={0}
                        onClick={() => {
                            vscode.postMessage({
                                type: "toggleMcpServer",
                                serverName: server.name,
                                disabled: !server.disabled,
                            })
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                vscode.postMessage({
                                    type: "toggleMcpServer",
                                    serverName: server.name,
                                    disabled: !server.disabled,
                                })
                            }
                        }}
                    >
                        <ToggleSwitchThumb $active={!server.disabled} />
                    </ToggleSwitch>
                </ServerToggle>
                <StatusIndicator $status={server.status} />
            </ServerHeader>

            {server.error ? (
                <ErrorContainer>
                    <ErrorMessage>
                        {server.error}
                    </ErrorMessage>
                    <VSCodeButton
                        appearance="secondary"
                        onClick={handleRestart}
                        disabled={server.status === "connecting"}
                        style={{
                            width: "calc(100% - 20px)",
                            margin: "0 10px 10px 10px",
                        }}>
                        {server.status === "connecting" ? "Retrying..." : "Retry Connection"}
                    </VSCodeButton>

                    <DangerButton
                        style={{ width: "calc(100% - 20px)", margin: "0 10px 10px 10px" }}
                        disabled={isDeleting}
                        onClick={handleDelete}>
                        {isDeleting ? "Deleting..." : "Delete Server"}
                    </DangerButton>
                </ErrorContainer>
            ) : (
                isExpanded && (
                    <div
                        style={{
                            background: "var(--vscode-textCodeBlock-background)",
                            padding: "0 10px 10px 10px",
                            fontSize: "13px",
                            borderRadius: "0 0 4px 4px",
                        }}>
                        <VSCodePanels>
                            <VSCodePanelTab id="tools">Tools ({server.tools?.length || 0})</VSCodePanelTab>
                            <VSCodePanelTab id="resources">
                                Resources ({[...(server.resourceTemplates || []), ...(server.resources || [])].length || 0})
                            </VSCodePanelTab>

                            <VSCodePanelView id="tools-view">
                                {server.tools && server.tools.length > 0 ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            width: "100%",
                                        }}>
                                        {server.tools.map((tool) => (
                                            <McpToolRow key={tool.name} tool={tool} serverName={server.name} />
                                        ))}
                                        {server.name && autoApprovalSettings.enabled && autoApprovalSettings.actions.useMcp && (
                                            <VSCodeCheckbox
                                                style={{ marginBottom: -10 }}
                                                checked={server.tools.every((tool) => tool.autoApprove)}
                                                onChange={handleAutoApproveChange}
                                                data-tool="all-tools">
                                                Auto-approve all tools
                                            </VSCodeCheckbox>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            padding: "10px 0",
                                            color: "var(--vscode-descriptionForeground)",
                                        }}>
                                        No tools found
                                    </div>
                                )}
                            </VSCodePanelView>

                            <VSCodePanelView id="resources-view">
                                {(server.resources && server.resources.length > 0) ||
                                (server.resourceTemplates && server.resourceTemplates.length > 0) ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            width: "100%",
                                        }}>
                                        {[...(server.resourceTemplates || []), ...(server.resources || [])].map((item) => (
                                            <McpResourceRow
                                                key={"uriTemplate" in item ? item.uriTemplate : item.uri}
                                                item={item}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            padding: "10px 0",
                                            color: "var(--vscode-descriptionForeground)",
                                        }}>
                                        No resources found
                                    </div>
                                )}
                            </VSCodePanelView>
                        </VSCodePanels>

                        <div style={{ margin: "10px 7px" }}>
                            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Request Timeout</label>
                            <VSCodeDropdown style={{ width: "100%" }} value={timeoutValue} onChange={handleTimeoutChange}>
                                {timeoutOptions.map((option) => (
                                    <VSCodeOption key={option.value} value={option.value}>
                                        {option.label}
                                    </VSCodeOption>
                                ))}
                            </VSCodeDropdown>
                        </div>
                        <GlassButton
                            appearance="secondary"
                            onClick={handleRestart}
                            disabled={server.status === "connecting"}
                            style={{
                                width: "calc(100% - 14px)",
                                margin: "0 7px 3px 7px",
                            }}>
                            {server.status === "connecting" ? "Restarting..." : "Restart Server"}
                        </GlassButton>

                        <DangerButton
                            style={{ width: "calc(100% - 14px)", margin: "5px 7px 3px 7px" }}
                            disabled={isDeleting}
                            onClick={handleDelete}>
                            {isDeleting ? "Deleting..." : "Delete Server"}
                        </DangerButton>
                    </div>
                )
            )}
        </>
    );
};

// Keep existing TabButton since it's already using styled-components
export const StyledTabButton = styled.button<{ isActive: boolean }>`
    background: none;
    border: none;
    border-bottom: 2px solid ${(props) => (props.isActive ? "var(--vscode-foreground)" : "transparent")};
    color: ${(props) => (props.isActive ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)")};
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    margin-bottom: -1px;
    font-family: inherit;
    ${hoverEffect}

    &:hover {
        color: var(--vscode-foreground);
    }
`

export const TabButton = ({
    children,
    isActive,
    onClick,
}: {
    children: React.ReactNode
    isActive: boolean
    onClick: () => void
}) => (
    <StyledTabButton isActive={isActive} onClick={onClick}>
        {children}
    </StyledTabButton>
)

export default McpView