/**
 * ClickUp Client
 * 封裝 ClickUp REST API 操作
 */

const BASE_URL = 'https://api.clickup.com/api/v2';

/**
 * 建立 ClickUp API 客戶端
 * @param {string} token - ClickUp Personal API Token
 */
export function createClickUpClient(token) {
  const headers = {
    Authorization: token,
    'Content-Type': 'application/json',
  };

  /**
   * 通用 API 請求
   */
  async function request(method, path, body = null) {
    const url = `${BASE_URL}${path}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`ClickUp API Error [${res.status}]: ${JSON.stringify(data)}`);
    }
    return data;
  }

  return {
    /**
     * 取得 Task 詳細資訊
     * @param {string} taskId - Task ID 或 Custom ID（如 NS-2030）
     */
    async getTask(taskId) {
      return request('GET', `/task/${taskId}?custom_task_ids=true&include_subtasks=true`);
    },

    /**
     * 建立 Task（或 Subtask）
     * @param {string} listId - List ID
     * @param {Object} taskData - Task 資料
     * @param {string} taskData.name - 名稱
     * @param {string} taskData.markdown_description - Markdown 描述
     * @param {string} [taskData.parent] - 父 Task ID（建立 Subtask 時）
     * @param {string} [taskData.status] - 狀態
     * @param {string} [taskData.task_type] - Task 類型（Bug, User Story 等）
     */
    async createTask(listId, taskData) {
      return request('POST', `/list/${listId}/task`, taskData);
    },

    /**
     * 更新 Task
     * @param {string} taskId - Task ID
     * @param {Object} updates - 要更新的欄位
     */
    async updateTask(taskId, updates) {
      return request('PUT', `/task/${taskId}`, updates);
    },

    /**
     * 附加檔案到 Task（base64）
     * @param {string} taskId - Task ID
     * @param {string} fileName - 檔案名稱
     * @param {Buffer} fileBuffer - 檔案 Buffer
     */
    async attachFile(taskId, fileName, fileBuffer) {
      const url = `${BASE_URL}/task/${taskId}/attachment`;
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('attachment', blob, fileName);

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: token },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`ClickUp Attach Error [${res.status}]: ${JSON.stringify(data)}`);
      }
      return data;
    },

    /**
     * 批次建立多筆 Subtask
     * @param {string} listId - List ID
     * @param {string} parentTaskId - 父 Task ID
     * @param {Array<Object>} tasks - Task 資料陣列
     * @returns {Array<Object>} 建立結果
     */
    async createBatchSubtasks(listId, parentTaskId, tasks) {
      const results = [];
      for (const task of tasks) {
        try {
          const result = await this.createTask(listId, {
            ...task,
            parent: parentTaskId,
          });
          results.push({ success: true, ...result });
          // ClickUp API rate limit: 100 requests/min
          await new Promise((r) => setTimeout(r, 600));
        } catch (err) {
          results.push({ success: false, name: task.name, error: err.message });
        }
      }
      return results;
    },
  };
}
