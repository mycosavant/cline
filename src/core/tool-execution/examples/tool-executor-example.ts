/**
 * Example usage of the ToolExecutor class
 * 
 * This file demonstrates how to use the ToolExecutor class to execute tools
 * in different modes (single, sequential, parallel, conditional, composite).
 */

import { Cline } from "../../Cline";
import { ToolExecutor } from "../ToolExecutor";
import { ToolExecutionMode } from "../types";
import { ToolUse } from "../../../shared/tools";

/**
 * Example function that demonstrates how to use the ToolExecutor class
 * @param cline Cline instance
 */
export async function toolExecutorExample(cline: Cline): Promise<void> {
  // Create a new ToolExecutor instance
  const toolExecutor = new ToolExecutor(cline);

  // Example 1: Execute a single tool
  console.log("Example 1: Execute a single tool");
  const singleTool: ToolUse = {
    type: "tool_use",
    name: "read_file",
    params: {
      path: "example.txt"
    },
    partial: false
  };

  try {
    const singleResult = await toolExecutor.executeTool(singleTool);
    console.log("Single tool result:", singleResult);
  } catch (error) {
    console.error("Error executing single tool:", error);
  }

  // Example 2: Execute tools sequentially
  console.log("\nExample 2: Execute tools sequentially");
  const sequentialTools: ToolUse[] = [
    {
      type: "tool_use",
      name: "read_file",
      params: {
        path: "input.txt"
      },
      partial: false,
      toolId: "read-input"
    },
    {
      type: "tool_use",
      name: "write_to_file",
      params: {
        path: "output.txt",
        content: "Modified content",
        line_count: "1"
      },
      partial: false,
      toolId: "write-output",
      dependsOn: "read-input"
    }
  ];

  try {
    const sequentialResults = await toolExecutor.executeTools(
      sequentialTools,
      ToolExecutionMode.SEQUENTIAL
    );
    console.log("Sequential execution results:", sequentialResults);
  } catch (error) {
    console.error("Error executing sequential tools:", error);
  }

  // Example 3: Execute tools in parallel
  console.log("\nExample 3: Execute tools in parallel");
  const parallelTools: ToolUse[] = [
    {
      type: "tool_use",
      name: "read_file",
      params: {
        path: "file1.txt"
      },
      partial: false,
      toolId: "read-file1"
    },
    {
      type: "tool_use",
      name: "read_file",
      params: {
        path: "file2.txt"
      },
      partial: false,
      toolId: "read-file2"
    }
  ];

  try {
    const parallelResults = await toolExecutor.executeTools(
      parallelTools,
      ToolExecutionMode.PARALLEL
    );
    console.log("Parallel execution results:", parallelResults);
  } catch (error) {
    console.error("Error executing parallel tools:", error);
  }

  // Example 4: Execute a JSON tool execution
  console.log("\nExample 4: Execute a JSON tool execution");
  const jsonExecution = {
    execution: {
      mode: "sequential",
      tools: [
        {
          name: "read_file",
          toolId: "read-json",
          params: {
            path: "data.json"
          }
        },
        {
          name: "write_to_file",
          toolId: "write-json",
          dependsOn: "read-json",
          params: {
            path: "output.json",
            content: '{"modified": true}',
            line_count: "1"
          }
        }
      ],
      options: {
        continueOnError: false
      }
    }
  };

  try {
    const jsonResults = await toolExecutor.executeJsonToolExecution(jsonExecution);
    console.log("JSON execution results:", jsonResults);
  } catch (error) {
    console.error("Error executing JSON tool execution:", error);
  }

  // Example 5: Execute a composite tool
  console.log("\nExample 5: Execute a composite tool");
  const compositeTool = {
    type: "tool_use",
    name: "composite_tool",
    params: {},
    partial: false,
    toolId: "file-processing",
    tools: [
      {
        type: "tool_use",
        name: "read_file",
        params: {
          path: "input.txt"
        },
        partial: false,
        toolId: "read-composite"
      },
      {
        type: "tool_use",
        name: "write_to_file",
        params: {
          path: "output.txt",
          content: "Processed content",
          line_count: "1"
        },
        partial: false,
        toolId: "write-composite",
        dependsOn: "read-composite"
      }
    ],
    mode: ToolExecutionMode.SEQUENTIAL
  };

  try {
    const compositeResult = await toolExecutor.executeCompositeTool(
      compositeTool as any,
      { continueOnError: true }
    );
    console.log("Composite tool result:", compositeResult);
  } catch (error) {
    console.error("Error executing composite tool:", error);
  }
}