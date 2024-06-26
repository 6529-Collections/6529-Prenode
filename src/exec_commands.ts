import { exec } from 'child_process';

const runCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
      } else if (stderr) {
        reject(`Stderr: ${stderr}`);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

export const getServerName = async (): Promise<string | null> => {
  const command = `sudo nginx -T 2>/dev/null | awk '/listen.*443/ {ssl=1} /server_name/ && ssl {print $2; exit}' | sed 's/;//'`;
  try {
    const output = await runCommand(command);
    const firstServerName = output.split('\n')[0];
    return firstServerName || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
