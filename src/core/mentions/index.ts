import * as fs from 'fs/promises';
import * as path from 'path';

async function getFileOrFolderContent(
  mentionPath: string,
  cwd: string,
  removeFirstSlash: boolean = false,
): Promise<string> {
  const fullPath = path.join(
    cwd,
    removeFirstSlash ? mentionPath.substring(1) : mentionPath,
  );

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isFile()) {
      return await fs.readFile(fullPath, 'utf-8');
    } else if (stats.isDirectory()) {
      const files = await fs.readdir(fullPath);
      let folderContent = '';
      for (const file of files) {
        const subFilePath = path.join(fullPath, file);
        const subFileStats = await fs.stat(subFilePath);
        if (subFileStats.isFile()) {
          folderContent += `--- filename: ${file} --- ${await fs.readFile(subFilePath, 'utf-8')}`;
        }
      }
      return folderContent;
    } else {
      throw new Error(`Mentioned path is neither a file nor a directory: ${mentionPath}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File or folder not found: ${mentionPath} (full path: ${fullPath})`);
    }
    throw error;
  }
}