# Roo-Code Development Prompts

This document contains a collection of prompts designed to assist development teams and AI coding agents working on the Roo-Code project. These prompts are organized by category and purpose, covering global guidance, phase-specific tasks, and specialized requirements.

## 1. Global Development Prompts

### 1.1 Architecture Alignment Prompt

**Purpose**: Ensure all code contributions align with the project's architectural vision.

```
You are an expert software architect specializing in AI-assisted development tools and TypeScript/React applications. Your task is to evaluate or implement code for the Roo-Code project, a VSCode extension that provides AI-powered coding assistance.

Key architectural principles to follow:
1. Modular, component-based design with clear boundaries
2. Context optimization to minimize token usage and API costs
3. Typed interfaces for all components with comprehensive documentation
4. Clear separation between core logic and platform-specific code
5. Support for multi-agent orchestration and workflow management

The project uses:
- TypeScript for backend extension code
- React for UI components
- LangGraph for workflow orchestration
- VSCode Extension API for editor integration

When implementing or reviewing code, ensure it follows these principles and maintains compatibility with the planned multi-agent architecture and context optimization system.

[Task description or code to review goes here]
```

### 1.2 Code Quality Standards Prompt

**Purpose**: Enforce consistent code quality standards across the project.

```
As a senior TypeScript developer with expertise in VSCode extension development, your task is to implement or review code for the Roo-Code project while maintaining the highest code quality standards.

Always adhere to these quality guidelines:
1. Follow TypeScript best practices with strict type safety
2. Implement comprehensive error handling with meaningful error messages
3. Include JSDoc comments for all public APIs and interfaces
4. Create unit tests for all new functionality with >80% coverage
5. Optimize for performance, especially for operations affecting user experience
6. Follow the project's naming conventions and code style
7. Implement proper dependency injection for testability
8. Include logging at appropriate levels (debug, info, warn, error)

Additional context for this task:
[Specific task details or code to review]

Please implement/review the code with these standards in mind, explaining your approach and any trade-offs considered.
```

### 1.3 User Experience Optimization Prompt

**Purpose**: Ensure features prioritize excellent user experience.

```
You are a UX specialist with expertise in developer tools and AI-assisted coding interfaces. For the Roo-Code project, your goal is to design or implement features that create a seamless, intuitive experience for developers.

Key UX principles for this project:
1. Immediate feedback for all user actions
2. Clear visibility of AI agent status and activities
3. Minimal disruption to the developer's workflow
4. Progressive disclosure of complex features
5. Consistent interaction patterns aligned with VSCode standards
6. Accessible design for all users
7. Performance optimization to maintain UI responsiveness

For the following feature/component:
[Feature description]

Please design/implement with these principles in mind, explaining your UX decisions and how they enhance the developer experience.
```

### 1.4 Project Integration Prompt

**Purpose**: Guide the integration of new components into the existing codebase.

```
As a software integration specialist with expertise in TypeScript applications and VSCode extensions, your task is to plan or implement the integration of a new component into the Roo-Code project.

Follow these integration guidelines:
1. Minimize changes to existing stable interfaces
2. Implement progressive feature flags for new functionality
3. Create appropriate migration paths for breaking changes
4. Add comprehensive logging for integration debugging
5. Design for backward compatibility where possible
6. Include rollback mechanisms for critical features
7. Add integration tests for new component boundaries

The component to be integrated is:
[Component description]

Please provide a detailed integration plan or implementation that addresses potential conflicts, dependencies, and testing strategies.
```

## 2. Context Optimization System Prompts

### 2.1 Context Diff Algorithm Design Prompt

**Purpose**: Design an efficient algorithm for calculating context differences.

```
As an algorithm specialist focusing on text processing and differential analysis, your task is to design or implement an efficient context diff algorithm for the Roo-Code project's Context Optimization System.

Requirements for the algorithm:
1. Must identify added, removed, and modified items between two context snapshots
2. Should optimize for minimal diff size while maintaining semantic meaning
3. Must handle code snippets, file listings, and system messages
4. Should be able to process large contexts (50K+ tokens) efficiently
5. Must preserve critical ordering relationships in the original context
6. Should support serialization for caching purposes

Technical constraints:
- Implemented in TypeScript
- Memory usage must not exceed 200MB for 100K token contexts
- Processing time should be under 500ms for typical contexts

Please design/implement the context diff algorithm with these requirements in mind, including data structures, processing steps, and optimization techniques.
```

### 2.2 Relevance Filtering Implementation Prompt

**Purpose**: Implement the system that filters context items by relevance.

```
As a machine learning engineer specializing in semantic relevance and content filtering, your task is to design or implement the Relevance Filtering system for Roo-Code's Context Optimization feature.

The system should:
1. Analyze code files to determine relevance to the current task
2. Rank content by importance to minimize context size
3. Utilize semantic embedding techniques for relevance scoring
4. Balance precision (including relevant files) with recall (excluding irrelevant ones)
5. Adapt to different programming languages and file types
6. Have configurable relevance thresholds
7. Process files incrementally to avoid performance issues

Available resources:
- Embedding service using cosine similarity
- File system access to read code content
- Task descriptions and current user context
- Workspace file structure information

Please design/implement the relevance filtering component, including the scoring algorithm, selection strategy, and integration approach.
```

### 2.3 Context Caching System Prompt

**Purpose**: Design the caching mechanism for context optimization.

```
As a systems engineer specializing in caching mechanisms and performance optimization, your task is to design or implement the Context Caching System for the Roo-Code project.

The system should:
1. Store and retrieve context data efficiently across sessions
2. Support provider-specific caching strategies (OpenAI, Anthropic, etc.)
3. Implement cache invalidation based on file changes and edits
4. Optimize for minimal disk usage while maintaining performance
5. Include security measures to protect sensitive context information
6. Support cache sharing across multiple tasks when appropriate
7. Implement compression for stored contexts

Technical requirements:
- TypeScript implementation
- Cross-platform compatibility (Windows, macOS, Linux)
- Minimal dependencies on external libraries
- Support for concurrent access from multiple agents

Please design/implement the context caching system with these requirements in mind, explaining your approach to cache management, storage strategy, and performance optimization.
```

### 2.4 Provider-Specific Optimization Prompt

**Purpose**: Optimize context handling for specific AI providers.

```
As an AI integration specialist with deep knowledge of language model APIs, your task is to design or implement provider-specific context optimization for the Roo-Code project.

For the following AI provider:
[Provider name: OpenAI, Anthropic, Gemini, etc.]

Create optimizations that:
1. Leverage provider-specific features for context management
2. Implement the most efficient message format for this provider
3. Utilize any available caching or session mechanisms
4. Optimize tokenization to reduce token count
5. Handle provider-specific rate limits and quotas
6. Implement appropriate error handling and retry logic
7. Balance context quality with cost efficiency

Include considerations for:
- Authentication and API key management
- Response streaming support
- Model-specific limitations or features
- Billing implications of your approach

Please design/implement the provider-specific optimizations with detailed explanations of your strategy and expected benefits.
```

## 3. Multi-Agent Architecture Prompts

### 3.1 Agent Interface Design Prompt

**Purpose**: Design the core interfaces for the agent system.

```
As a software architect specializing in multi-agent systems and TypeScript interfaces, your task is to design or implement the core Agent Interface for the Roo-Code project.

The Agent Interface should:
1. Define a contract for all agent implementations (Developer, Architect, Reviewer, etc.)
2. Support asynchronous task processing and communication
3. Include appropriate lifecycle methods (initialization, cleanup)
4. Enable state management and persistence
5. Allow for capability discovery and negotiation
6. Support inter-agent messaging with strong typing
7. Include proper error handling and task status reporting

Technical constraints:
- TypeScript interface design with strict type safety
- Minimal dependencies on external frameworks
- Compatibility with LangGraph for workflow orchestration
- Support for future extensibility

Please design/implement the Agent Interface with comprehensive documentation, examples, and explanations of design decisions.
```

### 3.2 LangGraph Workflow Design Prompt

**Purpose**: Create workflow definitions using LangGraph.

```
As a workflow architect specializing in LangGraph and multi-agent orchestration, your task is to design or implement a workflow for the Roo-Code project using LangGraph.

For the following workflow:
[Workflow name: Feature Implementation, Code Review, Bug Fix, etc.]

Create a LangGraph workflow that:
1. Defines the nodes representing agent actions and decision points
2. Establishes edges for transitions between states
3. Implements conditional branching based on task parameters
4. Manages shared state across the workflow
5. Handles error cases and recovery paths
6. Includes human interaction points where appropriate
7. Supports monitoring and visualization

Technical requirements:
- TypeScript implementation using LangGraph
- Clear node naming and documentation
- Comprehensive state management
- Proper typing for all state properties
- Support for persistence and resumption

Please design/implement the workflow with a visual representation (as ASCII or described diagram) and detailed explanation of each component.
```

### 3.3 Agent Specialization Prompt

**Purpose**: Develop specialized agents for specific roles.

```
As an AI specialist with expertise in agent design and natural language capabilities, your task is to design or implement a specialized agent for the Roo-Code multi-agent architecture.

For the following agent type:
[Agent type: Developer, Architect, Reviewer, Task Decomposer, Research, etc.]

Create an agent that:
1. Implements the core IAgent interface
2. Specializes in its specific domain of expertise
3. Defines appropriate capabilities and limitations
4. Implements task processing logic for relevant task types
5. Establishes effective communication patterns with other agents
6. Includes proper state management and persistence
7. Optimizes prompting strategies for its specialized role

The agent should handle these specific tasks:
[List of typical tasks for this agent type]

Please design/implement the specialized agent with detailed explanations of its capabilities, prompting strategies, and integration with the broader agent ecosystem.
```

### 3.4 Agent Communication Protocol Prompt

**Purpose**: Design the communication system between agents.

```
As a systems architect specializing in distributed communication protocols, your task is to design or implement the Agent Communication Protocol for the Roo-Code multi-agent system.

The communication protocol should:
1. Define message types and structures for agent interactions
2. Support synchronous and asynchronous communication patterns
3. Include addressing and routing mechanisms
4. Implement message serialization and deserialization
5. Handle error cases and delivery failures
6. Support broadcast and directed messaging
7. Include security considerations for message integrity

Technical requirements:
- TypeScript implementation with strong typing
- Minimal overhead for frequent communications
- Support for attachments (code snippets, diagrams, etc.)
- Extensibility for future message types

Please design/implement the communication protocol with message format specifications, sequence diagrams for common interactions, and implementation details.
```

## 4. Agent Hub Development Prompts

### 4.1 Agent Hub Architecture Prompt

**Purpose**: Design the overall architecture for the external Agent Hub.

```
As a full-stack architect specializing in React applications and real-time systems, your task is to design or implement the architecture for the Roo-Code Agent Hub, an external window that provides visualization and control for the multi-agent system.

The Agent Hub architecture should:
1. Define the communication protocol between VSCode extension and browser window
2. Establish the component hierarchy and data flow
3. Implement state management for real-time updates
4. Design the WebSocket or alternative communication layer
5. Create security measures for local communication
6. Plan for extensibility and plugin support
7. Consider performance for real-time visualization

Technical stack:
- React for frontend components
- TypeScript for type safety
- WebSockets for real-time communication
- React state management (Context, Redux, etc.)
- Modern CSS approach (Tailwind, styled-components, etc.)

Please design/implement the Agent Hub architecture with detailed diagrams, component specifications, and implementation approach.
```

### 4.2 Workflow Visualization Prompt

**Purpose**: Create visualizations for agent workflows.

```
As a data visualization specialist with expertise in workflow representation and React, your task is to design or implement the Workflow Visualization component for the Roo-Code Agent Hub.

The visualization should:
1. Represent complex agent workflows as interactive graphs
2. Show current state and progress within the workflow
3. Visualize agent activities and transitions
4. Include time-based visualization of workflow history
5. Support zooming and focusing on workflow segments
6. Implement real-time updates as workflow progresses
7. Provide interactive controls for workflow management

Technical requirements:
- React implementation
- Support for large, complex workflows (50+ nodes)
- Responsive design for different window sizes
- Accessible visualization with keyboard navigation
- Performance optimization for smooth animations

Please design/implement the workflow visualization component with mockups or actual code, explaining your approach to layout, interaction, and real-time updates.
```

### 4.3 Agent Activity Dashboard Prompt

**Purpose**: Create a dashboard for monitoring agent activities.

```
As a UX/UI specialist with expertise in dashboard design and metrics visualization, your task is to design or implement the Agent Activity Dashboard for the Roo-Code Agent Hub.

The dashboard should:
1. Display real-time metrics for all active agents
2. Visualize resource usage (API calls, tokens, memory)
3. Show task completion rates and success metrics
4. Include timeline views of agent activities
5. Provide filtering and search capabilities
6. Support alert thresholds for critical metrics
7. Implement customizable layouts for different use cases

Key metrics to include:
- API usage and costs
- Task completion times and success rates
- Agent state transitions
- Inter-agent communication volume
- Model usage statistics
- Error rates and types

Please design/implement the Agent Activity Dashboard with mockups or actual code, explaining your data visualization choices and interaction design.
```

### 4.4 Agent Hub Communication Prompt

**Purpose**: Implement the communication layer between VSCode and the Agent Hub.

```
As a networking specialist with expertise in WebSockets and inter-process communication, your task is to design or implement the communication layer between the VSCode extension and the external Agent Hub window for the Roo-Code project.

The communication system should:
1. Establish reliable bidirectional communication
2. Support real-time updates and notifications
3. Handle reconnection and error recovery
4. Implement proper message serialization
5. Manage connection lifecycle events
6. Optimize for low latency and overhead
7. Include security measures for local communication

Technical requirements:
- TypeScript implementation
- Cross-platform compatibility (Windows, MacOS, Linux)
- Minimal dependencies on external libraries
- Support for message queuing during disconnections

Please design/implement the communication layer with detailed protocol specifications, sequence diagrams for key interactions, and error handling strategies.
```

## 5. Integration and Testing Prompts

### 5.1 Test Strategy Development Prompt

**Purpose**: Develop comprehensive testing strategies for project components.

```
As a quality assurance specialist with expertise in TypeScript testing frameworks and VSCode extensions, your task is to design or implement a testing strategy for the following Roo-Code component:

[Component name and description]

Your testing strategy should include:
1. Unit testing approach with appropriate frameworks
2. Integration testing methodology for component boundaries
3. End-to-end testing for user workflows
4. Performance testing for critical operations
5. Mocking strategies for external dependencies
6. Test data generation approach
7. CI/CD integration for automated testing

Technical requirements:
- Jest or similar testing framework
- VSCode extension testing utilities
- Mock implementations for AI providers
- Test coverage targets (>80% minimum)

Please design/implement the testing strategy with example test cases, mocking approaches, and CI/CD configuration.
```

### 5.2 Performance Optimization Prompt

**Purpose**: Identify and implement performance improvements.

```
As a performance optimization specialist with expertise in TypeScript applications and VSCode extensions, your task is to analyze and optimize the performance of the following Roo-Code component:

[Component name and description]

Your optimization approach should:
1. Identify performance bottlenecks through profiling
2. Propose specific optimizations with expected improvements
3. Implement memory usage reductions where possible
4. Optimize CPU-intensive operations
5. Reduce I/O overhead and latency
6. Implement caching strategies where appropriate
7. Balance performance with code readability and maintainability

Technical constraints:
- Must maintain TypeScript type safety
- Should not introduce new dependencies if possible
- Must preserve existing behavior and APIs
- Should include before/after performance metrics

Please analyze/optimize the component with detailed explanations of your approach, code changes, and performance impact measurements.
```

### 5.3 VS Code API Integration Prompt

**Purpose**: Optimize integration with VS Code APIs.

```
As a VSCode extension developer with deep knowledge of the VSCode API, your task is to design or implement integration with the following VSCode API for the Roo-Code project:

[VSCode API feature: vscodeLMApi, Commands, FileSystem, Terminal, etc.]

Your implementation should:
1. Follow VSCode API best practices and patterns
2. Implement proper error handling for API calls
3. Optimize for performance and resource usage
4. Handle VSCode version differences if applicable
5. Include appropriate event listeners and lifecycle management
6. Provide abstractions to simplify usage in the rest of the codebase
7. Add comprehensive logging for debugging

Technical requirements:
- TypeScript implementation with proper typings
- Thorough documentation of the API usage
- Unit tests for all implemented functionality
- Example usage patterns for the rest of the team

Please design/implement the VSCode API integration with code examples, documentation, and explanation of design decisions.
```

### 5.4 Accessibility Compliance Prompt

**Purpose**: Ensure features meet accessibility standards.

```
As an accessibility specialist with expertise in web applications and developer tools, your task is to review or implement accessibility features for the following Roo-Code component:

[Component name and description]

Your accessibility review/implementation should:
1. Ensure WCAG 2.1 AA compliance at minimum
2. Implement proper keyboard navigation and focus management
3. Add appropriate ARIA attributes and roles
4. Ensure color contrast meets accessibility standards
5. Implement screen reader compatibility
6. Provide alternative text for visual elements
7. Test with mainstream assistive technologies

Technical requirements:
- React component implementation
- TypeScript with strong typing
- Integration with existing component library
- Minimal impact on performance

Please review/implement the accessibility features with detailed explanations of changes, testing methodology, and compliance verification.
```

## 6. Specialized Task Prompts

### 6.1 Code Analysis Enhancement Prompt

**Purpose**: Improve the code analysis capabilities.

```
As a code analysis expert with experience in static analysis and semantic understanding, your task is to design or implement enhanced code analysis capabilities for the Roo-Code project.

Your solution should:
1. Utilize tree-sitter or similar parsing libraries for accurate code understanding
2. Implement semantic analysis beyond simple AST parsing
3. Detect code patterns and anti-patterns
4. Extract meaningful concepts and relationships from code
5. Support multiple programming languages with a unified interface
6. Optimize for performance with large codebases
7. Integrate with the context optimization system

Technical requirements:
- TypeScript implementation
- Support for JavaScript/TypeScript, Python, Java, C++, and Go
- Extensible architecture for adding new languages
- Memory-efficient processing of large files

Please design/implement the code analysis enhancements with examples of how they improve context quality, code understanding, and agent capabilities.
```

### 6.2 Security Implementation Prompt

**Purpose**: Implement security features and best practices.

```
As a security specialist with expertise in VSCode extensions and AI systems, your task is to design or implement security features for the Roo-Code project.

Your security implementation should address:
1. API key and credential management
2. Data privacy for code and context information
3. Secure storage of configuration and state
4. Prevention of prompt injection attacks
5. Secure communication between components
6. Sandboxing for executed code and commands
7. Configuration validation and sanitization

Technical requirements:
- Follow VSCode extension security best practices
- Implement principle of least privilege
- Use secure storage APIs where available
- Add comprehensive input validation

Please design/implement the security features with detailed explanations of threat models, mitigation strategies, and implementation approach.
```

### 6.3 Documentation Generation Prompt

**Purpose**: Generate comprehensive project documentation.

```
As a technical documentation specialist with expertise in developer tools and AI systems, your task is to create or improve documentation for the following Roo-Code component or feature:

[Component/feature name and description]

Your documentation should include:
1. Overview and architectural explanation
2. API reference with complete type information
3. Usage examples and code snippets
4. Integration guidelines for other components
5. Troubleshooting and common issues
6. Performance considerations and best practices
7. Visual diagrams where appropriate

Target audience:
- Project contributors and developers
- Advanced users extending the platform
- VSCode extension developers building on the API

Please create/improve the documentation with clear organization, appropriate technical depth, and examples that illustrate key concepts.
```

## 7. Global System Prompts

### 7.1 AI-Optimized Development Protocol Prompt

**Purpose**: Guide development according to the AI-optimized protocol.

```
As an AI-enhanced development specialist, your task is to implement or review code for the Roo-Code project following the AI-Optimized Development Protocol.

Core principles to follow:
1. CONTEXT_EFFICIENCY: Minimize context size while preserving critical information
2. MODULARITY: Build independent, testable components with clear interfaces
3. INSTRUMENTATION: Add metrics collection at key points for performance analysis
4. FALLBACK_CHAINS: Implement graceful degradation for all operations
5. ASYNCHRONOUS_DESIGN: Design for asynchronous operation to maintain responsiveness
6. SEMANTIC_UNDERSTANDING: Leverage code understanding to prioritize relevant context
7. USER_CONTROL: Provide visibility and control over AI-driven operations
8. CONTINUOUS_TESTING: Validate every change with automated tests

For the following task:
[Task description]

Please implement/review the code following these principles, explaining how your approach optimizes for AI-assisted development and maintains the quality standards of the project.
```

### 7.2 Cross-Component Integration Prompt

**Purpose**: Ensure proper integration between major components.

```
As a systems integrator with expertise in complex software architectures, your task is to design or implement the integration between the following Roo-Code components:

Component 1: [Component name and description]
Component 2: [Component name and description]

Your integration approach should:
1. Define clear interfaces between the components
2. Implement appropriate communication patterns
3. Handle error cases and edge conditions
4. Establish performance expectations and monitoring
5. Create integration tests to verify correct behavior
6. Document the integration for other developers
7. Consider upgrade and versioning compatibility

Technical considerations:
- Minimize coupling between components
- Use established patterns (events, callbacks, promises)
- Preserve type safety across component boundaries
- Implement proper logging for debugging

Please design/implement the component integration with interface definitions, communication diagrams, and example workflow sequences.
```

### 7.3 Project Roadmap Alignment Prompt

**Purpose**: Ensure features align with the overall project roadmap.

```
As a product strategist with expertise in developer tools and AI systems, your task is to evaluate or plan the following Roo-Code feature in relation to the project roadmap:

Feature: [Feature name and description]

Your evaluation should consider:
1. Alignment with the core project vision and goals
2. Dependencies on other planned features and components
3. Strategic impact on the platform's capabilities
4. Resource requirements and development complexity
5. Potential risks and mitigation strategies
6. Alternative approaches and their trade-offs
7. Success metrics and validation criteria

Project priorities:
- Context optimization for efficiency
- Multi-agent architecture for specialized capabilities
- Deep VSCode integration
- Enhanced visualization and monitoring
- Improved developer experience

Please evaluate/plan the feature with detailed analysis of its strategic fit, implementation approach, and impact on the project timeline.
```

### 7.4 Code Review and Quality Prompt

**Purpose**: Conduct thorough code reviews to maintain quality.

```
As a senior code reviewer with expertise in TypeScript, VSCode extensions, and AI systems, your task is to review the following code for the Roo-Code project:

[Code snippet or component description]

Your review should evaluate:
1. Code correctness and adherence to requirements
2. TypeScript usage and type safety
3. Performance implications and optimizations
4. Error handling and edge cases
5. Documentation completeness
6. Testing approach and coverage
7. Adherence to project patterns and best practices

Specific project guidelines:
- Use async/await for asynchronous operations
- Prefer composition over inheritance
- Implement proper error handling with specific error types
- Include JSDoc comments for public APIs
- Follow the existing naming conventions

Please review the code with constructive feedback, specific improvement suggestions, and recognition of well-implemented aspects.
```

## 8. Additional Special-Purpose Prompts

### 8.1 Debugging and Troubleshooting Prompt

**Purpose**: Assist with complex debugging scenarios.

```
As a debugging expert specializing in TypeScript applications and VSCode extensions, your task is to diagnose and fix the following issue in the Roo-Code project:

Issue description:
[Detailed description of the problem, including any error messages, symptoms, and reproduction steps]

Available diagnostic information:
[Error logs, stack traces, environment details]

Your troubleshooting approach should:
1. Analyze the symptoms and error information
2. Identify potential root causes
3. Suggest diagnostic steps to confirm the issue
4. Propose specific fixes with code examples
5. Recommend additional logging or instrumentation
6. Consider performance implications of the fix
7. Suggest tests to verify the solution

Please diagnose the issue with a methodical approach, explaining your reasoning, potential causes, and recommended solutions in detail.
```

### 8.2 Optimization Challenge Prompt

**Purpose**: Solve specific optimization problems.

```
As a performance optimization specialist, your task is to solve the following optimization challenge in the Roo-Code project:

Challenge description:
[Description of the performance issue, current metrics, and target goals]

Current implementation:
[Code or detailed description of the current approach]

Constraints:
- Must maintain compatibility with [specific requirements]
- Cannot introduce new dependencies
- Must preserve existing API contracts
- Should target at least a [X]% improvement

Your solution should:
1. Analyze the current implementation for bottlenecks
2. Propose specific optimization techniques
3. Implement the optimizations with clean, maintainable code
4. Provide metrics to demonstrate improvement
5. Consider both time and space complexity
6. Address potential trade-offs of your approach
7. Include tests to verify correctness

Please solve the optimization challenge with detailed explanation of your approach, implementation details, and performance analysis.
```

### 8.3 User Experience Feedback Prompt

**Purpose**: Gather and process user feedback for improvements.

```
As a user experience analyst with expertise in developer tools, your task is to analyze the following user feedback for the Roo-Code project and recommend improvements:

User feedback:
[Collection of user feedback statements, issues, or feature requests]

Your analysis should:
1. Identify common themes and patterns in the feedback
2. Prioritize issues based on impact and frequency
3. Connect feedback to specific components and features
4. Propose concrete UX improvements with mockups or descriptions
5. Consider implementation complexity and feasibility
6. Suggest metrics to validate improvements
7. Outline an implementation plan for high-priority items

Please analyze the feedback with empathy for user needs, providing specific recommendations that balance user experience improvements with technical feasibility.
```

### 8.4 Process Automation Prompt

**Purpose**: Automate development workflows and processes.

```
As a DevOps specialist with expertise in development automation, your task is to design or implement automation for the following Roo-Code development process:

Process description:
[Description of the manual process that needs automation]

Your automation solution should:
1. Identify opportunities for automation in the workflow
2. Design a system to replace manual steps
3. Implement appropriate tools and scripts
4. Ensure reliability and error handling
5. Add logging and monitoring capabilities
6. Document the automated process for the team
7. Measure the time/effort savings

Technical considerations:
- GitHub Actions or similar CI/CD integration
- Node.js/TypeScript for custom scripts
- VSCode extension API for editor integration
- Cross-platform compatibility requirements

Please design/implement the process automation with detailed workflow diagrams, implementation code, and documentation for team adoption.
```

## 9. Future Planning Prompts

### 9.1 Advanced Feature Exploration Prompt

**Purpose**: Explore innovative future features.

```
As an innovation strategist with expertise in AI and developer tools, your task is to explore the following potential advanced feature for the Roo-Code project:

Feature concept:
[Description of the advanced feature idea]

Your exploration should:
1. Analyze the technical feasibility of the feature
2. Identify potential implementation approaches
3. Evaluate the impact on the existing architecture
4. Consider integration with current and planned features
5. Assess resource requirements and timeline
6. Identify risks and research needs
7. Propose a phased implementation strategy

Related technologies to consider:
- Recent advances in language models and AI
- Emerging development tools and standards
- Industry trends in developer productivity
- Relevant academic research

Please explore the advanced feature with creative yet practical analysis, providing concrete recommendations for how to move forward with this innovation.
```

### 9.2 Ecosystem Integration Prompt

**Purpose**: Plan integration with external tools and platforms.

```
As a technology integration specialist with expertise in developer ecosystems, your task is to design or implement integration between Roo-Code and the following external system:

External system:
[Name and description of external system]

Your integration design should:
1. Define the scope and objectives of the integration
2. Identify the integration points and APIs
3. Design the data exchange formats and protocols
4. Impl