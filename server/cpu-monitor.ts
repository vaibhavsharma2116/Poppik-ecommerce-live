
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CPUMonitor {
  private static instance: CPUMonitor;
  private highCPUWarned = false;

  static getInstance(): CPUMonitor {
    if (!CPUMonitor.instance) {
      CPUMonitor.instance = new CPUMonitor();
    }
    return CPUMonitor.instance;
  }

  async getCurrentCPUUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  async getPostgresCPUUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync("ps aux | grep postgres | grep -v grep | awk '{sum += $3} END {print sum}'");
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  async killHighCPUPostgresProcesses(): Promise<void> {
    try {
      // Kill postgres processes using more than 50% CPU
      await execAsync("ps aux | grep postgres | awk '$3 > 50 {print $2}' | xargs -I {} kill -15 {} 2>/dev/null || true");
      console.log("Killed high CPU PostgreSQL processes");
    } catch (error) {
      console.error("Error killing high CPU processes:", error);
    }
  }

  startMonitoring(): void {
    setInterval(async () => {
      try {
        const cpuUsage = await this.getCurrentCPUUsage();
        const postgresCPU = await this.getPostgresCPUUsage();

        if (cpuUsage > 90) {
          if (!this.highCPUWarned) {
            console.warn(`🚨 HIGH CPU USAGE: ${cpuUsage}% (PostgreSQL: ${postgresCPU}%)`);
            this.highCPUWarned = true;

            // If PostgreSQL is using too much CPU, kill high usage processes
            if (postgresCPU > 100) {
              await this.killHighCPUPostgresProcesses();
            }
          }
        } else {
          this.highCPUWarned = false;
        }
      } catch (error) {
        console.error("CPU monitoring error:", error);
      }
    }, 5000); // Check every 5 seconds
  }
}
