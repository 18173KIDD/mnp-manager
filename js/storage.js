/**
 * ストレージ管理モジュール
 * localStorageを使ってデータの保存と読み込みを行う
 * v2.0.0 - セッション→グループ管理に変更
 */
const Storage = (() => {
    // 保存用のキー
    const CUSTOMERS_KEY = 'mnp_app_customers';
    const GROUPS_KEY = 'mnp_app_groups';  // グループ情報保存用の新しいキー
    const SESSIONS_KEY = 'mnp_app_sessions'; // 旧キー（互換性のために維持）
    const NAMES_KEY = 'mnp_app_names'; // 名義情報保存用のキー
    const ERROR_LOGS_KEY = 'mnp_app_error_logs'; // エラーログ保存用のキー
    
    /**
     * 顧客データを保存する
     * @param {Array} customers - 顧客データの配列
     */
    const saveCustomers = (customers) => {
        try {
            localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
        } catch (e) {
            console.error('顧客データの保存に失敗しました', e);
            alert('顧客データの保存に失敗しました');
        }
    };
    
    /**
     * 顧客データを取得する
     * @returns {Array} 顧客データの配列
     */
    const getCustomers = () => {
        try {
            const data = localStorage.getItem(CUSTOMERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('顧客データの取得に失敗しました', e);
            return [];
        }
    };
    
    /**
     * 顧客を追加/更新する
     * @param {Object} customer - 顧客オブジェクト
     */
    const addOrUpdateCustomer = (customer) => {
        if (!customer || !customer.name) return;
        
        const customers = getCustomers();
        const existingIndex = customers.findIndex(c => c.name === customer.name);
        
        if (existingIndex >= 0) {
            // 既存の顧客を更新
            customers[existingIndex] = { ...customers[existingIndex], ...customer };
        } else {
            // 新規顧客を追加
            customers.push(customer);
        }
        
        saveCustomers(customers);
    };
    
    /**
     * 顧客を削除する
     * @param {string} name - 削除する顧客の名前
     */
    const removeCustomer = (name) => {
        if (!name) return;
        
        const customers = getCustomers();
        const updatedCustomers = customers.filter(c => c.name !== name);
        
        saveCustomers(updatedCustomers);
    };
    
    /**
     * グループデータを保存する
     * @param {Array} groups - グループデータの配列
     */
    const saveGroups = (groups) => {
        try {
            localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
        } catch (e) {
            console.error('グループデータの保存に失敗しました', e);
            alert('グループデータの保存に失敗しました');
        }
    };
    
    /**
     * グループデータを取得する
     * @returns {Array} グループデータの配列
     */
    const getGroups = () => {
        try {
            // まず新しい形式でデータを探す
            let data = localStorage.getItem(GROUPS_KEY);
            
            // 新形式のデータがなければ、旧形式（セッション）を移行する
            if (!data) {
                const oldData = localStorage.getItem(SESSIONS_KEY);
                if (oldData) {
                    const sessions = JSON.parse(oldData);
                    // セッションからグループに変換
                    const groups = sessions.map(session => {
                        return {
                            ...session,
                            groupName: `${new Date(session.date).toLocaleDateString()} - ${session.customerName}`,
                            migratedFromSession: true
                        };
                    });
                    
                    // 変換したデータを保存
                    saveGroups(groups);
                    return groups;
                }
                return [];
            }
            
            return JSON.parse(data);
        } catch (e) {
            console.error('グループデータの取得に失敗しました', e);
            return [];
        }
    };
    
    /**
     * グループを追加する
     * @param {Object} group - グループオブジェクト
     * @param {String} groupName - グループ名
     */
    const addGroup = (group, groupName) => {
        if (!group) return;
        
        const groups = getGroups();
        
        // グループIDを生成（タイムスタンプベース）
        const groupId = Date.now().toString();
        const newGroup = { 
            id: groupId, 
            ...group, 
            groupName: groupName || `${new Date(group.date).toLocaleDateString()} - ${group.customerName}`,
            createdAt: new Date().toISOString() 
        };
        
        groups.push(newGroup);
        saveGroups(groups);
        
        return groupId;
    };
    
    /**
     * グループを更新する
     * @param {string} groupId - 更新するグループのID
     * @param {Object} groupData - 更新するグループデータ
     */
    const updateGroup = (groupId, groupData) => {
        if (!groupId || !groupData) return false;
        
        const groups = getGroups();
        const groupIndex = groups.findIndex(g => g.id === groupId);
        
        if (groupIndex >= 0) {
            groups[groupIndex] = { 
                ...groups[groupIndex], 
                ...groupData,
                updatedAt: new Date().toISOString()
            };
            saveGroups(groups);
            return true;
        }
        
        return false;
    };
    
    /**
     * グループを削除する
     * @param {string} groupId - 削除するグループのID
     */
    const removeGroup = (groupId) => {
        if (!groupId) return;
        
        const groups = getGroups();
        const updatedGroups = groups.filter(g => g.id !== groupId);
        
        saveGroups(updatedGroups);
    };
    
    /**
     * グループを取得する
     * @param {string} groupId - 取得するグループのID
     * @returns {Object|null} グループオブジェクトまたはnull
     */
    const getGroup = (groupId) => {
        if (!groupId) return null;
        
        const groups = getGroups();
        return groups.find(g => g.id === groupId) || null;
    };
    
    /**
     * 名義情報データを取得する（読み取り専用）
     * @returns {Array} 名義情報の配列
     * @deprecated 名義管理機能は非推奨となりました
     */
    const getNames = () => {
        try {
            const data = localStorage.getItem(NAMES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('名義情報の取得に失敗しました', e);
            return [];
        }
    };
    
    // 以下の名義管理関連の関数は非推奨となり、効果を持ちません
    const saveNames = () => {};
    const addName = () => false;
    const updateName = () => false;
    const removeName = () => false;
    
    /**
     * 全データを削除する
     */
    const clearAllData = () => {
        try {
            localStorage.removeItem(CUSTOMERS_KEY);
            localStorage.removeItem(SESSIONS_KEY);
            localStorage.removeItem(GROUPS_KEY);
            localStorage.removeItem(NAMES_KEY);
            return true;
        } catch (e) {
            console.error('データの削除に失敗しました', e);
            return false;
        }
    };
    
    // 互換性のための旧関数
    const getSessions = getGroups;
    const addSession = (session) => addGroup(session);
    const updateSession = updateGroup;
    const removeSession = removeGroup;
    const getSession = getGroup;
    
    /**
     * エラーログを追加する
     * @param {Object} error - エラーオブジェクトまたはエラー情報
     * @param {String} context - エラー発生時のコンテキスト情報
     */
    const logError = (error, context = '') => {
        try {
            // 既存のログを取得
            const errorLogs = getErrorLogs();
            
            // エラー情報を生成
            const errorInfo = {
                timestamp: new Date().toISOString(),
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : null,
                context: context
            };
            
            // ログを追加（古いログが流れるように上限数を設定）
            errorLogs.unshift(errorInfo); // 新しいエラーを先頭に追加
            
            // ログ数の上限を設定（50件まで制限）
            const MAX_LOGS = 50;
            if (errorLogs.length > MAX_LOGS) {
                errorLogs.length = MAX_LOGS;
            }
            
            // ログを保存
            localStorage.setItem(ERROR_LOGS_KEY, JSON.stringify(errorLogs));
            
            // デバッグ用のコンソール出力
            console.error('[ERROR LOG]', errorInfo.message, context);
            
            return true;
        } catch (e) {
            // ログ記録自体が失敗した場合はコンソールに出力のみ
            console.error('エラーログの記録に失敗しました:', e);
            return false;
        }
    };
    
    /**
     * エラーログを取得する
     * @returns {Array} エラーログの配列
     */
    const getErrorLogs = () => {
        try {
            const data = localStorage.getItem(ERROR_LOGS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('エラーログ取得に失敗しました:', e);
            return [];
        }
    };
    
    /**
     * エラーログをクリアする
     */
    const clearErrorLogs = () => {
        try {
            localStorage.removeItem(ERROR_LOGS_KEY);
            return true;
        } catch (e) {
            console.error('エラーログのクリアに失敗しました:', e);
            return false;
        }
    };
    
    /**
     * エラーログをファイルとしてダウンロードする
     */
    const downloadErrorLogs = () => {
        try {
            const errorLogs = getErrorLogs();
            if (errorLogs.length === 0) {
                return false;
            }
            
            // ログをテキスト形式に変換
            const logText = errorLogs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString();
                return `[日時] ${timestamp}\n[内容] ${log.message}\n[コンテキスト] ${log.context || 'なし'}${log.stack ? '\n[スタック] ' + log.stack : ''}\n\n`;
            }).join('-------------------\n');
            
            // ファイル名を生成
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
            const fileName = `MNPアプリ_エラーログ_${timestamp}.txt`;
            
            // ファイルダウンロード
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (e) {
            console.error('エラーログのダウンロードに失敗しました:', e);
            return false;
        }
    };
    
    // 公開API
    return {
        getCustomers,
        addOrUpdateCustomer,
        removeCustomer,
        // 新しいグループ関連API
        getGroups,
        addGroup,
        updateGroup,
        removeGroup,
        getGroup,
        // 名義情報API
        getNames,
        addName,
        updateName,
        removeName,
        // エラーログAPI
        logError,
        getErrorLogs,
        clearErrorLogs,
        downloadErrorLogs,
        // 互換性のための旧API
        getSessions,
        addSession,
        updateSession,
        removeSession,
        getSession,
        
        clearAllData
    };
})();