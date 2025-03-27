/**
 * MNP契約情報管理表
 * メインのアプリケーションロジック
 * v2.6.0 - 印刷機能改善版（複数ページ・文字化け修正）
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('アプリケーション初期化開始');
    
    // DOM参照を取得
    const elements = {
        // 新規追加要素
        savedGroupsToggle: document.getElementById('saved-groups-toggle'),
        savedGroupsPanel: document.getElementById('saved-groups-panel'),
        
        // 顧客情報関連
        currentDateInput: document.getElementById('current-date'),
        customerNameInput: document.getElementById('customer-name'),
        customerAgeInput: document.getElementById('customer-age'),
        reservationDateInput: document.getElementById('reservation-date'),
        reservationTimeInput: document.getElementById('reservation-time'),
        customerListDatalist: document.getElementById('customer-list'),
        
        // 回線情報関連
        lineTableBody: document.getElementById('line-table-body'),
        addLineButton: document.getElementById('add-line'),
        clearLinesButton: document.getElementById('clear-lines'),
        
        // 操作ボタン関連
        clearAllButton: document.getElementById('clear-all'),
        printTableButton: document.getElementById('print-table'),
        
        // プレビュー関連
        previewHeader: document.getElementById('preview-header'),
        previewBody: document.getElementById('preview-body'),
        previewSection: document.querySelector('.preview-section'),
        previewContainer: document.querySelector('#preview-container'),
        previewTable: document.getElementById('preview-table'),
        
        // グループ管理関連
        groupNameInput: document.getElementById('group-name'),
        saveGroupButton: document.getElementById('save-group'),
        groupsContainer: document.getElementById('groups-container'),
        
        // 出力関連
        groupSelect: document.getElementById('group-select'),
        exportPdfButton: document.getElementById('export-pdf'),
        exportCsvButton: document.getElementById('export-csv')
    };
    
    // 現在の日付をデフォルト値として設定
    const today = new Date();
    if (elements.currentDateInput) {
        elements.currentDateInput.valueAsDate = today;
    }
    
    // 編集モードの状態
    let editingGroupId = null;
    
    // 列幅の最適化設定
    const optimizeColumnWidths = () => {
        const previewTable = document.getElementById('preview-table');
        if (!previewTable) return;
        
        // テーブル自体の幅を設定 - 最大幅に調整
        previewTable.style.width = '100%';
        previewTable.style.maxWidth = '100%';
        
        // 各セルの表示を最適化するスタイルを追加
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @media print {
                #preview-table { width: 100% !important; table-layout: fixed !important; }
                #preview-table th, #preview-table td { 
                    overflow: visible !important; 
                    text-overflow: clip !important;
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    max-width: none !important;
                }
                /* 空白ページ抑制 */
                body { height: auto !important; }
                html { height: auto !important; }
                .preview-section { page-break-after: avoid !important; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                @page { size: landscape; margin: 5mm; }
                /* これ以降を印刷しないように */
                #preview-container::after { display: none !important; }
                @page :blank { display: none; }
            }
        `;
        document.head.appendChild(styleElement);
        
        // 列幅をバランス良く設定する
        const columnWidths = [
            '15%',  // 電話番号
            '17%',  // MNP予約番号
            '12%',  // 移転元キャリア
            '15%',  // 乗り換え元名義
            '15%',  // 乗り換え先名義
            '12%',  // 利用者
            '14%'   // 関係
        ];
        
        try {
            // theadの最後の行の列数を取得
            const headerRow = previewTable.querySelector('thead tr:last-child');
            if (!headerRow) return;
            
            const cells = headerRow.querySelectorAll('th');
            if (cells.length !== columnWidths.length) return;
            
            // 各列の幅を設定
            cells.forEach((cell, index) => {
                if (index < columnWidths.length) {
                    cell.style.width = columnWidths[index];
                    cell.style.maxWidth = 'none';
                    cell.style.overflow = 'visible';
                    cell.style.whiteSpace = 'normal';
                    cell.style.wordWrap = 'break-word';
                }
            });
            
            // プレビューコンテナのクリーンアップ
            const previewSection = document.querySelector('.preview-section');
            if (previewSection) {
                previewSection.style.height = 'auto';
                previewSection.style.pageBreakAfter = 'avoid';
                previewSection.style.pageBreakBefore = 'avoid';
                previewSection.style.pageBreakInside = 'avoid';
                
                // 空白ページ無効化の追加処理
                const printFix = previewSection.querySelector('.print-fix');
                if (printFix) {
                    printFix.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('列幅最適化エラー:', error);
        }
    };
    
    // 名義情報を抽出して保存する関数（自動管理用）
    const extractAndSaveNames = () => {
        console.log('名義情報抽出実行');
        
        // 回線情報からすべての名義を抽出
        const nameItems = [];
        
        // 入力欄から名前を抽出
        const sourceNameInputs = document.querySelectorAll('.source-name');
        const destNameInputs = document.querySelectorAll('.dest-name');
        const userNameInputs = document.querySelectorAll('.user-name');
        
        // 乗り換え元名義から抽出
        sourceNameInputs.forEach(input => {
            const name = input.value.trim();
            if (name) nameItems.push(name);
        });
        
        // 乗り換え先名義から抽出
        destNameInputs.forEach(input => {
            const name = input.value.trim();
            if (name) nameItems.push(name);
        });
        
        // 利用者名から抽出
        userNameInputs.forEach(input => {
            const name = input.value.trim();
            if (name) nameItems.push(name);
        });
        
        // 重複を削除
        const uniqueNames = [...new Set(nameItems)];
        
        // 名義リストを更新
        updateNamesList('source-names-list', uniqueNames);
        updateNamesList('dest-names-list', uniqueNames);
        updateNamesList('users-list', uniqueNames);
        
        console.log('抽出された名義情報:', uniqueNames);
    };
    
    // 名義リストを更新する関数
    const updateNamesList = (datalistId, names) => {
        const datalist = document.getElementById(datalistId);
        if (!datalist) {
            console.error(`データリスト ${datalistId} が見つかりません`);
            return;
        }
        
        // データリストをクリア
        datalist.innerHTML = '';
        
        // 名義リストを追加
        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    };
    
    // インライン編集用の関数
    const editGroupInline = (groupId, groupItem) => {
        // 編集モードに設定
        editingGroupId = groupId;
        
        // グループに編集モードのクラスを追加
        groupItem.classList.add('edit-mode');
        
        // 保存ボタンを表示
        const saveEditBtn = groupItem.querySelector('.save-edit-btn');
        if (saveEditBtn) {
            saveEditBtn.style.display = 'inline-block';
        }
        
        // 編集可能なフィールドをハイライト
        const editableFields = groupItem.querySelectorAll('.editable-field');
        editableFields.forEach(field => {
            field.setAttribute('title', 'クリックして編集');
        });
        
        alert('編集モードに入りました\n編集したい項目をクリックすると編集できます');
    };
    
    // 編集済みグループを保存する関数
    const saveEditedGroupInline = (groupId, groupItem) => {
        // 編集中の場合のみ処理
        if (editingGroupId !== groupId) return;
        
        // グループデータを取得
        const group = Storage.getGroup(groupId);
        if (!group) {
            alert('編集するグループが見つかりません');
            return;
        }
        
        // 編集モードを終了
        editingGroupId = null;
        
        // グループの編集モードクラスを削除
        groupItem.classList.remove('edit-mode');
        
        // 保存ボタンを非表示
        const saveEditBtn = groupItem.querySelector('.save-edit-btn');
        if (saveEditBtn) {
            saveEditBtn.style.display = 'none';
        }
        
        // 編集済みのデータを保存
        Storage.updateGroup(groupId, group);
        
        // グループリストを更新
        initializeGroupList();
        
        // グループ選択リストの更新も行う
        updateGroupSelect();
        
        alert('グループを保存しました');
    };
    
    // 編集可能なフィールドのイベント設定
    const setupEditableFields = () => {
        const editableFields = document.querySelectorAll('.editable-field');
        
        editableFields.forEach(field => {
            field.addEventListener('click', (e) => {
                // 編集モードの場合のみ編集可能
                const groupId = field.dataset.groupId;
                if (editingGroupId !== groupId) return;
                
                // 現在の値を取得
                const currentValue = field.textContent.trim();
                const fieldName = field.dataset.field;
                const lineIndex = field.dataset.lineIndex;
                
                // 入力ダイアログを表示
                const newValue = prompt(`${fieldName}を編集:`, currentValue === '-' ? '' : currentValue);
                
                // キャンセルされた場合は何もしない
                if (newValue === null) return;
                
                // グループデータを取得
                const group = Storage.getGroup(groupId);
                if (!group) return;
                
                // 回線情報の場合
                if (lineIndex !== undefined) {
                    if (!group.lines[lineIndex]) return;
                    
                    // 値を更新
                    group.lines[lineIndex][fieldName] = newValue.trim();
                } else {
                    // 通常フィールドの場合
                    group[fieldName] = newValue.trim();
                }
                
                // グループを更新
                Storage.updateGroup(groupId, group);
                
                // 表示を更新
                field.textContent = newValue.trim() || '-';
            });
        });
    };
    
    // 顧客リストを初期化
    const initializeCustomerList = () => {
        const customers = Storage.getCustomers();
        
        const customerListDatalist = elements.customerListDatalist;
        if (!customerListDatalist) {
            console.error('顧客リストのデータリストが見つかりません');
            return;
        }
        
        // データリストをクリア
        customerListDatalist.innerHTML = '';
        
        // 顧客リストを作成
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.name;
            customerListDatalist.appendChild(option);
        });
    };
    
    // グループリストを初期化
    const initializeGroupList = () => {
        // グループ一覧を表示
        renderGroupsList();
    };
    
    // グループ一覧を表示
    const renderGroupsList = () => {
        const groups = Storage.getGroups();
        
        const groupsContainer = elements.groupsContainer;
        if (!groupsContainer) {
            console.error('グループコンテナが見つかりません');
            return;
        }
        
        // グループコンテナをクリア
        groupsContainer.innerHTML = '';
        
        // 各グループを表示
        groups.forEach(group => {
            if (!group || !group.id) {
                console.error('無効なグループデータ:', group);
                return;
            }
            
            try {
                const groupName = group.groupName || `${new Date(group.date || new Date()).toLocaleDateString()} - ${group.customerName || '名称なし'}`;
                const createdAt = group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '不明';
                
                const groupItem = document.createElement('div');
                groupItem.className = 'group-item';
                groupItem.dataset.id = group.id;
                
                // 編集中の場合は編集モードのクラスを追加
                if (editingGroupId === group.id) {
                    groupItem.classList.add('edit-mode');
                }
                
                const groupHeader = document.createElement('div');
                groupHeader.className = 'group-header';
                groupHeader.innerHTML = `
                    <div class="group-info">
                        <span class="group-title">${groupName}</span>
                        <span class="group-date">作成日: ${createdAt}</span>
                    </div>
                    <div class="group-actions">
                        <button class="btn btn-info edit-btn">編集</button>
                        <button class="btn btn-success save-edit-btn" style="display: ${editingGroupId === group.id ? 'inline-block' : 'none'}">保存</button>
                        <button class="btn btn-danger delete-btn">削除</button>
                    </div>
                `;
                
                // グループ内容
                const groupContent = document.createElement('div');
                groupContent.className = 'group-content';
                
                // 編集中の場合は自動的に展開
                if (editingGroupId === group.id) {
                    groupContent.classList.add('active');
                    groupHeader.classList.add('active');
                }
                
                // グループヘッダーのクリックでトグル
                groupHeader.addEventListener('click', (e) => {
                    // ボタンクリック時は何もしない（イベントバブリングを防止）
                    if (e.target.tagName === 'BUTTON') return;
                    
                    groupContent.classList.toggle('active');
                    groupHeader.classList.toggle('active');
                });
                
                // 編集ボタンのイベント
                const editBtn = groupHeader.querySelector('.edit-btn');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // イベントバブリングを防止
                    
                    // 既に展開されていない場合は展開
                    if (!groupContent.classList.contains('active')) {
                        groupContent.classList.add('active');
                        groupHeader.classList.add('active');
                    }
                    
                    // グループ詳細画面から直接編集する機能
                    editGroupInline(group.id, groupItem);
                });
                
                // 保存ボタンのイベント
                const saveEditBtn = groupHeader.querySelector('.save-edit-btn');
                saveEditBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // イベントバブリングを防止
                    saveEditedGroupInline(group.id, groupItem);
                });
                
                // 削除ボタンのイベント
                const deleteBtn = groupHeader.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // イベントバブリングを防止
                    if (confirm(`「${groupName}」を削除してもよろしいですか？\nこの操作は元に戻せません。`)) {
                        Storage.removeGroup(group.id);
                        initializeGroupList();
                        updateGroupSelect();
                    }
                });
                
                // グループの内容を表示
                const contentTable = document.createElement('table');
                contentTable.className = 'group-detail-table';
                
                // ヘッダー情報
                const headerRow = document.createElement('tr');
                const formattedDate = group.date ? new Date(group.date).toLocaleDateString() : '-';
                headerRow.innerHTML = `
                    <th>日付</th>
                    <td>${formattedDate}</td>
                    <th>名前</th>
                    <td>
                        <span class="editable-field" data-field="customerName" data-group-id="${group.id}">
                            ${group.customerName || '-'}
                        </span>
                    </td>
                    <th>年齢</th>
                    <td>
                        <span class="editable-field" data-field="customerAge" data-group-id="${group.id}">
                            ${group.customerAge || '-'}
                        </span>
                    </td>
                `;
                
                const reservationRow = document.createElement('tr');
                const reservationDate = group.reservationDate ? new Date(group.reservationDate).toLocaleDateString() : '-';
                reservationRow.innerHTML = `
                    <th>予約希望日</th>
                    <td>
                        <span class="editable-field" data-field="reservationDate" data-group-id="${group.id}">
                            ${reservationDate}
                        </span>
                    </td>
                    <th>予約希望時間</th>
                    <td>
                        <span class="editable-field" data-field="reservationTime" data-group-id="${group.id}">
                            ${group.reservationTime || '-'}
                        </span>
                    </td>
                    <td colspan="2"></td>
                `;
                
                // グループのテーブルを構築
                contentTable.appendChild(headerRow);
                contentTable.appendChild(reservationRow);
                
                // 回線情報
                if (group.lines && group.lines.length > 0) {
                    const linesHeader = document.createElement('tr');
                    linesHeader.innerHTML = `
                        <th colspan="6">回線情報</th>
                    `;
                    contentTable.appendChild(linesHeader);
                    
                    const lineHeaderRow = document.createElement('tr');
                    lineHeaderRow.innerHTML = `
                        <th>電話番号</th>
                        <th>MNP予約番号</th>
                        <th>乗り換え元名義</th>
                        <th>乗り換え先名義</th>
                        <th>利用者</th>
                        <th>関係</th>
                    `;
                    contentTable.appendChild(lineHeaderRow);
                    
                    group.lines.forEach((line, index) => {
                        const lineRow = document.createElement('tr');
                        lineRow.dataset.lineIndex = index;
                        
                        lineRow.innerHTML = `
                            <td>
                                <span class="editable-field" data-field="phoneNumber" data-line-index="${index}" data-group-id="${group.id}">
                                    ${line.phoneNumber || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="editable-field" data-field="mnpNumber" data-line-index="${index}" data-group-id="${group.id}">
                                    ${line.mnpNumber || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="editable-field" data-field="sourceName" data-line-index="${index}" data-group-id="${group.id}">
                                    ${line.sourceName || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="editable-field" data-field="destName" data-line-index="${index}" data-group-id="${group.id}">
                                    ${line.destName || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="editable-field" data-field="user" data-line-index="${index}" data-group-id="${group.id}">
                                    ${line.user || '-'}
                                </span>
                            </td>
                            <td>
                                <span class="editable-field" data-field="relation" data-line-index="${index}" data-group-id="${group.id}">
                                    ${line.relation || '-'}
                                </span>
                            </td>
                        `;
                        contentTable.appendChild(lineRow);
                    });
                } else {
                    const noLinesRow = document.createElement('tr');
                    noLinesRow.innerHTML = `<td colspan="6">回線情報はありません</td>`;
                    contentTable.appendChild(noLinesRow);
                }
                
                groupContent.appendChild(contentTable);
                
                // グループアイテムに追加
                groupItem.appendChild(groupHeader);
                groupItem.appendChild(groupContent);
                
                // グループコンテナに追加
                groupsContainer.appendChild(groupItem);
            } catch (error) {
                console.error('グループの表示中にエラーが発生しました:', error, group);
            }
        });
        
        // 編集可能なフィールドのイベントリスナーを設定
        setupEditableFields();
    };
    
    // 回線行を追加する関数
    const addLineRow = (data = {}) => {
        const lineTableBody = elements.lineTableBody;
        if (!lineTableBody) {
            console.error('回線情報テーブルが見つかりません');
            return;
        }
        
        const newRow = document.createElement('tr');
        
        // 削除ボタンセル
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.className = 'delete-btn';
        deleteButton.addEventListener('click', () => {
            if (confirm('この行を削除してもよろしいですか？')) {
                newRow.remove();
                updatePreview();
                extractAndSaveNames();
            }
        });
        deleteCell.appendChild(deleteButton);
        
        // 電話番号セル
        const phoneCell = document.createElement('td');
        const phoneInput = document.createElement('input');
        phoneInput.type = 'text';
        phoneInput.className = 'phone-number';
        phoneInput.placeholder = '例: 09012345678';
        phoneInput.value = data.phoneNumber || '';
        phoneInput.addEventListener('input', updatePreview);
        phoneCell.appendChild(phoneInput);
        
        // MNP予約番号セル
        const mnpCell = document.createElement('td');
        const mnpInput = document.createElement('input');
        mnpInput.type = 'text';
        mnpInput.className = 'mnp-number';
        mnpInput.placeholder = '例: 1234567890';
        mnpInput.value = data.mnpNumber || '';
        mnpInput.addEventListener('input', updatePreview);
        mnpCell.appendChild(mnpInput);
        
        // 移転元キャリアセル
        const carrierCell = document.createElement('td');
        const carrierSelect = document.createElement('select');
        carrierSelect.className = 'carrier-select';
        carrierSelect.value = data.carrier || '';
        carrierSelect.addEventListener('change', updatePreview);
        
        // キャリアリスト
        const carriers = ['docomo', 'au', 'SoftBank', '楽天'];
        
        // 選択肢を追加
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- 選択 --';
        carrierSelect.appendChild(defaultOption);
        
        // キャリア選択肢を追加
        carriers.forEach(carrier => {
            const option = document.createElement('option');
            option.value = carrier;
            option.textContent = carrier;
            if (data.carrier === carrier) {
                option.selected = true;
            }
            carrierSelect.appendChild(option);
        });
        
        carrierCell.appendChild(carrierSelect);
        
        // データリストの確認
        const ensureDatalist = (id) => {
            let datalist = document.getElementById(id);
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = id;
                document.body.appendChild(datalist);
            }
            return datalist;
        };
        
        // 各データリストの確保
        ensureDatalist('source-names-list');
        ensureDatalist('dest-names-list');
        ensureDatalist('users-list');
        
        // 乗り換え元名義セル
        const sourceCell = document.createElement('td');
        const sourceInput = document.createElement('input');
        sourceInput.type = 'text';
        sourceInput.className = 'source-name';
        sourceInput.placeholder = '乗り換え元の名義';
        sourceInput.value = data.sourceName || '';
        sourceInput.setAttribute('list', 'source-names-list');
        sourceInput.addEventListener('input', updatePreview);
        sourceInput.addEventListener('blur', extractAndSaveNames);
        sourceCell.appendChild(sourceInput);
        
        // 乗り換え先名義セル
        const destCell = document.createElement('td');
        const destInput = document.createElement('input');
        destInput.type = 'text';
        destInput.className = 'dest-name';
        destInput.placeholder = '乗り換え先の名義';
        destInput.value = data.destName || '';
        destInput.setAttribute('list', 'dest-names-list');
        destInput.addEventListener('input', updatePreview);
        destInput.addEventListener('blur', extractAndSaveNames);
        destCell.appendChild(destInput);
        
        // 利用者セル
        const userCell = document.createElement('td');
        const userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.className = 'user-name';
        userInput.placeholder = '利用者名';
        userInput.value = data.user || '';
        userInput.setAttribute('list', 'users-list');
        userInput.addEventListener('input', updatePreview);
        userInput.addEventListener('blur', extractAndSaveNames);
        userCell.appendChild(userInput);
        
        // 関係セル
        const relationCell = document.createElement('td');
        const relationContainer = document.createElement('div');
        relationContainer.className = 'relation-container';
        
        // 関係セレクトボックス
        const relationSelect = document.createElement('select');
        relationSelect.className = 'relation';
        relationSelect.value = data.relation || '';
        
        // 関係リスト
        const relations = ['本人', '家族', '配偶者', '子', '親', 'その他'];
        
        // 選択肢を追加
        const defaultRelationOption = document.createElement('option');
        defaultRelationOption.value = '';
        defaultRelationOption.textContent = '-- 関係 --';
        relationSelect.appendChild(defaultRelationOption);
        
        relations.forEach(relation => {
            const option = document.createElement('option');
            option.value = relation;
            option.textContent = relation;
            if (data.relation === relation) {
                option.selected = true;
            }
            relationSelect.appendChild(option);
        });
        
        // その他用のテキストボックス
        const otherRelationInput = document.createElement('input');
        otherRelationInput.type = 'text';
        otherRelationInput.className = 'other-relation';
        otherRelationInput.placeholder = '具体的な関係を入力';
        otherRelationInput.style.display = data.relation === 'その他' ? 'block' : 'none';
        otherRelationInput.value = data.otherRelation || '';
        
        // セレクトボックス変更時の処理
        relationSelect.addEventListener('change', () => {
            const isOther = relationSelect.value === 'その他';
            otherRelationInput.style.display = isOther ? 'block' : 'none';
            updatePreview();
        });
        
        // その他テキスト入力時の処理
        otherRelationInput.addEventListener('input', updatePreview);
        
        // 要素をコンテナに追加
        relationContainer.appendChild(relationSelect);
        relationContainer.appendChild(otherRelationInput);
        relationCell.appendChild(relationContainer);
        
        // 行にセルを追加
        newRow.appendChild(deleteCell);
        newRow.appendChild(phoneCell);
        newRow.appendChild(mnpCell);
        newRow.appendChild(carrierCell);
        newRow.appendChild(sourceCell);
        newRow.appendChild(destCell);
        newRow.appendChild(userCell);
        newRow.appendChild(relationCell);
        
        // テーブルに行を追加
        lineTableBody.appendChild(newRow);
        
        // プレビューを更新
        updatePreview();
    };
    
    // プレビューを更新する関数
    const updatePreview = () => {
        const { previewHeader, previewBody, lineTableBody } = elements;
        
        if (!previewHeader || !previewBody) {
            console.error('プレビュー要素が見つかりません');
            return;
        }
        
        // ヘッダー情報を更新
        const headerHTML = createHeaderPreview();
        previewHeader.innerHTML = headerHTML;
        
        // ボディ情報を更新
        previewBody.innerHTML = '';
        
        // 各行のデータを取得して表示
        const rows = lineTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            try {
                const phoneNumber = row.querySelector('.phone-number').value;
                const mnpNumber = row.querySelector('.mnp-number').value;
                const carrier = row.querySelector('.carrier-select')?.value || '';
                const sourceName = row.querySelector('.source-name').value;
                const destName = row.querySelector('.dest-name').value;
                const userName = row.querySelector('.user-name').value;
                const relationSelect = row.querySelector('.relation');
                const relation = relationSelect?.value || '';
                let otherRelation = '';
                
                // その他が選択されている場合はテキスト入力値を取得
                if (relation === 'その他') {
                    otherRelation = row.querySelector('.other-relation')?.value || '';
                }
                
                // 乗り換え元の名義に番号を付ける
                const numberedSourceName = sourceName ? `${index + 1}${sourceName}` : '';
                
                const previewRow = document.createElement('tr');
                // 関係の表示テキストを生成
                let relationDisplay = relation;
                if (relation === 'その他' && otherRelation) {
                    relationDisplay = `その他(${otherRelation})`;
                }
                
                previewRow.innerHTML = `
                    <td>${phoneNumber}</td>
                    <td>${mnpNumber}</td>
                    <td>${carrier}</td>
                    <td>${numberedSourceName}</td>
                    <td>${destName}</td>
                    <td>${userName}</td>
                    <td>${relationDisplay}</td>
                `;
                
                previewBody.appendChild(previewRow);
            } catch (error) {
                console.error('行のプレビュー生成中にエラーが発生しました:', error, row);
            }
        });
        
        // 列幅最適化
        optimizeColumnWidths();
    };
    
    // ヘッダープレビューを作成する関数
    const createHeaderPreview = () => {
        try {
            const { currentDateInput, customerNameInput, customerAgeInput, reservationDateInput, reservationTimeInput } = elements;
            
            const date = currentDateInput?.value ? new Date(currentDateInput.value).toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}) : '';
            const customerName = customerNameInput?.value || '';
            const customerAge = customerAgeInput?.value || '';
            const reservationDate = reservationDateInput?.value ? new Date(reservationDateInput.value).toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}) : '';
            const reservationTime = reservationTimeInput?.value || '';
            
            const reservationDateTime = reservationDate && reservationTime ? `${reservationDate} ${reservationTime}頃` : '';
            
            return `
                <th>${date}</th>
                <th colspan="3">名前:${customerName} 年齢:${customerAge}</th>
                <th colspan="3">予約希望日時:${reservationDateTime}</th>
            `;
        } catch (error) {
            console.error('ヘッダープレビュー生成中にエラーが発生しました:', error);
            return '<th colspan="7">ヘッダー情報の生成エラー</th>';
        }
    };
    
    // グループを保存する関数
    const saveGroup = () => {
        try {
            const { customerNameInput, customerAgeInput, groupNameInput } = elements;
            
            // 顧客情報を保存
            const customerName = customerNameInput.value.trim();
            const customerAge = customerAgeInput.value;
            
            if (customerName) {
                Storage.addOrUpdateCustomer({
                    name: customerName,
                    age: customerAge
                });
                
                // 顧客リストを更新
                initializeCustomerList();
            }
            
            // 現在の入力データを取得
            const currentData = getCurrentFormData();
            
            // 入力が不十分な場合は警告
            if (!currentData.customerName) {
                alert('顧客名を入力してください');
                return;
            }
            
            if (currentData.lines.length === 0) {
                alert('少なくとも1つの回線情報を入力してください');
                return;
            }
            
            // グループ名（日付＋顧客名）をデフォルトで作成
            const defaultGroupName = `${new Date(currentData.date || new Date()).toLocaleDateString()} - ${currentData.customerName}`;
            // ユーザー入力のグループ名または自動生成名
            const groupName = groupNameInput.value.trim() || defaultGroupName;
            
            // 保存前に確認
            if (confirm(`「${groupName}」として保存してもよろしいですか？`)) {
                // グループとして保存
                const groupId = Storage.addGroup(currentData, groupName);
                
                if (groupId) {
                    console.log('グループが保存されました: ' + groupId);
                } else {
                    console.error('グループの保存に失敗しました');
                }
                
                // グループ名を保存したらクリア
                groupNameInput.value = '';
                
                // グループリストを更新
                initializeGroupList();
                // グループ選択リストも更新
                updateGroupSelect();
                
                alert('データを保存しました');
            }
        } catch (error) {
            console.error('グループ保存中にエラーが発生しました:', error);
            alert('グループの保存中にエラーが発生しました。開発者ツールでログを確認してください。');
        }
    };
    
    // 編集中のグループを保存する関数
    const saveEditedGroup = () => {
        if (!editingGroupId) return;
        
        try {
            // 現在の入力データを取得
            const currentData = getCurrentFormData();
            
            // 入力が不十分な場合は警告
            if (!currentData.customerName) {
                alert('顧客名を入力してください');
                return;
            }
            
            if (currentData.lines.length === 0) {
                alert('少なくとも1つの回線情報を入力してください');
                return;
            }
            
            // グループ名を保持
            const group = Storage.getGroup(editingGroupId);
            if (!group) {
                alert('編集するグループが見つかりません');
                return;
            }
            
            // 更新データにグループ名を追加
            currentData.groupName = group.groupName;
            
            // グループを更新
            Storage.updateGroup(editingGroupId, currentData);
            
            // 編集モードを終了
            editingGroupId = null;
            
            // グループリストを更新
            initializeGroupList();
            // グループ選択リストも更新
            updateGroupSelect();
            
            // フォームをクリア
            clearForm();
            
            alert('グループを更新しました');
        } catch (error) {
            console.error('グループ更新中にエラーが発生しました:', error);
            alert('グループの更新中にエラーが発生しました。開発者ツールでログを確認してください。');
        }
    };
    
    // グループ編集モードに入る関数
    const editGroup = (groupId) => {
        try {
            // グループデータを取得
            const group = Storage.getGroup(groupId);
            if (!group) {
                alert('グループが見つかりません');
                return;
            }
            
            // 編集モードに設定
            editingGroupId = groupId;
            
            // フォームにデータを設定
            loadGroupData(group);
            
            // 対象のグループアイテムに編集中クラスを追加
            const groupItems = document.querySelectorAll('.group-item');
            groupItems.forEach(item => {
                if (item.dataset.id === groupId) {
                    item.classList.add('edit-mode');
                } else {
                    item.classList.remove('edit-mode');
                }
            });
            
            alert(`「${group.groupName || '名称なし'}」の編集モードに入りました。\n編集後に保存ボタンを押してください。`);
        } catch (error) {
            console.error('グループ編集モード設定中にエラーが発生しました:', error);
            alert('グループの編集設定中にエラーが発生しました。');
        }
    };
    
    // 現在のフォームデータを取得する関数
    const getCurrentFormData = () => {
        const { currentDateInput, customerNameInput, customerAgeInput, 
                reservationDateInput, reservationTimeInput, lineTableBody } = elements;
                
        // ヘッダー情報
        const date = currentDateInput?.value || new Date().toISOString().split('T')[0];
        const customerName = customerNameInput?.value || '';
        const customerAge = customerAgeInput?.value || '';
        const reservationDate = reservationDateInput?.value || '';
        const reservationTime = reservationTimeInput?.value || '';
        
        // 回線情報
        const lines = [];
        const rows = lineTableBody?.querySelectorAll('tr') || [];
        
        rows.forEach(row => {
            try {
                const phoneNumber = row.querySelector('.phone-number')?.value || '';
                const mnpNumber = row.querySelector('.mnp-number')?.value || '';
                const carrier = row.querySelector('.carrier-select')?.value || '';
                const sourceName = row.querySelector('.source-name')?.value || '';
                const destName = row.querySelector('.dest-name')?.value || '';
                const user = row.querySelector('.user-name')?.value || '';
                const relation = row.querySelector('.relation')?.value || '';
                
                // その他が選択されている場合はその入力値も保存
                let otherRelation = '';
                if (relation === 'その他') {
                    otherRelation = row.querySelector('.other-relation')?.value || '';
                }
                
                lines.push({
                    phoneNumber,
                    mnpNumber,
                    carrier,
                    sourceName,
                    destName,
                    user,
                    relation,
                    otherRelation
                });
            } catch (error) {
                console.error('行のデータ取得中にエラーが発生しました:', error, row);
            }
        });
        
        return {
            date,
            customerName,
            customerAge,
            reservationDate,
            reservationTime,
            lines
        };
    };
    
    // グループデータをロードする関数
    const loadGroupData = (group) => {
        if (!group) {
            alert('グループが見つかりませんでした');
            return;
        }
        
        const { currentDateInput, customerNameInput, customerAgeInput, 
                reservationDateInput, reservationTimeInput, lineTableBody } = elements;
        
        try {
            // フォームにデータを設定
            if (currentDateInput) currentDateInput.value = group.date || '';
            if (customerNameInput) customerNameInput.value = group.customerName || '';
            if (customerAgeInput) customerAgeInput.value = group.customerAge || '';
            if (reservationDateInput) reservationDateInput.value = group.reservationDate || '';
            if (reservationTimeInput) reservationTimeInput.value = group.reservationTime || '';
            
            // 回線情報をクリア
            if (lineTableBody) lineTableBody.innerHTML = '';
            
            // 回線情報を追加
            if (group.lines && group.lines.length > 0) {
                group.lines.forEach(line => {
                    addLineRow(line);
                });
            } else {
                // 行がない場合は空の行を追加
                addLineRow();
            }
            
            // プレビューを更新
            updatePreview();
            
            // 名義情報を抽出更新
            extractAndSaveNames();
        } catch (error) {
            console.error('グループデータのロード中にエラーが発生しました:', error, group);
            alert('グループデータのロード中にエラーが発生しました。');
        }
    };
    
    // フォームをクリアする関数
    const clearForm = () => {
        const { currentDateInput, customerNameInput, customerAgeInput, 
                reservationDateInput, reservationTimeInput, lineTableBody } = elements;
                
        // 編集モードをリセット
        editingGroupId = null;
        
        // フォームをクリア
        if (customerNameInput) customerNameInput.value = '';
        if (customerAgeInput) customerAgeInput.value = '';
        if (reservationDateInput) reservationDateInput.value = '';
        if (reservationTimeInput) reservationTimeInput.value = '';
        
        // 現在の日付を設定
        if (currentDateInput) currentDateInput.valueAsDate = new Date();
        
        // 回線情報をクリア
        if (lineTableBody) lineTableBody.innerHTML = '';
        
        // 空の行を追加
        addLineRow();
        
        // プレビューを更新
        updatePreview();
        
        // グループアイテムの編集モードをクリア
        const groupItems = document.querySelectorAll('.group-item');
        groupItems.forEach(item => {
            item.classList.remove('edit-mode');
        });
    };
    
    // グループ選択肢を更新
    const updateGroupSelect = () => {
        const { groupSelect } = elements;
        if (!groupSelect) {
            console.error('グループ選択要素が見つかりません');
            return;
        }
        
        try {
            const groups = Storage.getGroups();
            console.log('グループデータ取得:', groups?.length || 0, '件');
            
            // 選択肢をクリア
            groupSelect.innerHTML = '<option value="">すべてのグループ</option>';
            
            // グループが存在するか確認
            if (groups && groups.length > 0) {
                groups.forEach(group => {
                    if (group && group.id) {
                        const option = document.createElement('option');
                        option.value = group.id;
                        
                        // グループ名またはデフォルト名を使用
                        let displayName;
                        try {
                            displayName = group.groupName || `${new Date(group.date || new Date()).toLocaleDateString()} - ${group.customerName || '名称なし'}`;
                        } catch (error) {
                            console.error('グループ名生成エラー:', error, group);
                            displayName = `ID: ${group.id}`;
                        }
                        
                        option.textContent = displayName;
                        groupSelect.appendChild(option);
                    }
                });
                console.log('グループ選択肢を更新しました：', groups.length, '件');
            } else {
                console.log('保存されたグループがありません');
            }
        } catch (error) {
            console.error('グループ選択肢の更新中にエラーが発生しました:', error);
        }
    };
    
    // プレビューを更新（選択されたグループに基づいて）
    const updatePreviewForGroup = () => {
        const { groupSelect, previewHeader, previewBody, previewSection, previewContainer } = elements;
        if (!groupSelect || !previewHeader || !previewBody) {
            console.error('必要な要素が見つかりません');
            return;
        }
        
        try {
            const selectedGroupId = groupSelect.value;
            
            // プレビュー要素の表示確認
            if (previewSection) {
                previewSection.style.display = 'block';
            }
            
            // プレビュー表示前に印刷用スタイルを適用
            if (previewContainer) {
                previewContainer.classList.add('preview-ready');
            }
            
            // 列幅最適化
            optimizeColumnWidths();
            
            if (selectedGroupId) {
                // 特定のグループが選択された場合
                const group = Storage.getGroup(selectedGroupId);
                console.log('選択されたグループ:', selectedGroupId, group);
                
                if (group) {
                    // ヘッダー情報を更新（日付形式を改善）
                    const dateOptions = {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        weekday: 'short'
                    };
                    
                    let headerDate, customerInfo, reservationInfo;
                    
                    try {
                        headerDate = group.date ? new Date(group.date).toLocaleDateString('ja-JP', dateOptions) : '-';
                    } catch (e) {
                        console.error('日付変換エラー:', e, group.date);
                        headerDate = '-';
                    }
                    
                    customerInfo = `名前:${group.customerName || '-'} 年齢:${group.customerAge || '-'}`;
                    
                    try {
                        reservationInfo = group.reservationDate
                            ? `${new Date(group.reservationDate).toLocaleDateString('ja-JP', dateOptions)} ${group.reservationTime || ''}`
                            : '-';
                    } catch (e) {
                        console.error('予約日付変換エラー:', e, group.reservationDate);
                        reservationInfo = '-';
                    }
                    
                    const headerHTML = `
                        <th>${headerDate}</th>
                        <th colspan="3">${customerInfo}</th>
                        <th colspan="3">予約希望日時:${reservationInfo}</th>
                    `;
                    previewHeader.innerHTML = headerHTML;
                    
                    // ボディ情報の更新
                    previewBody.innerHTML = '';
                    if (group.lines && group.lines.length > 0) {
                        group.lines.forEach((line, index) => {
                            const previewRow = document.createElement('tr');
                            const numberedSourceName = line.sourceName ? `${index + 1}${line.sourceName}` : '';
                            let relationDisplay = line.relation || '';
                            if (line.relation === 'その他' && line.otherRelation) {
                                relationDisplay = `その他(${line.otherRelation})`;
                            }
                            
                            previewRow.innerHTML = `
                                <td>${line.phoneNumber || ''}</td>
                                <td>${line.mnpNumber || ''}</td>
                                <td>${line.carrier || ''}</td>
                                <td>${numberedSourceName}</td>
                                <td>${line.destName || ''}</td>
                                <td>${line.user || ''}</td>
                                <td>${relationDisplay}</td>
                            `;
                            previewBody.appendChild(previewRow);
                        });
                    }
                }
            } else {
                // すべてのグループが選択された場合は通常のプレビューを表示
                updatePreview();
            }
        } catch (error) {
            console.error('グループプレビュー更新中にエラーが発生しました:', error);
            // エラー時はシンプルなプレビューを表示
            if (previewHeader) {
                previewHeader.innerHTML = '<th colspan="7">プレビューの生成に失敗しました</th>';
            }
            if (previewBody) {
                previewBody.innerHTML = '<tr><td colspan="7">エラーが発生したため、プレビューを表示できません</td></tr>';
            }
        }
    };
    
    // イベントリスナーの設定
    const setupEventListeners = () => {
        const { savedGroupsToggle, savedGroupsPanel, customerNameInput, currentDateInput, customerAgeInput,
               reservationDateInput, reservationTimeInput, addLineButton, clearLinesButton, saveGroupButton,
               clearAllButton, printTableButton, groupSelect, exportPdfButton, exportCsvButton } = elements;
        
        // 保存済みグループのトグル機能
        if (savedGroupsToggle && savedGroupsPanel) {
            savedGroupsToggle.addEventListener('click', () => {
                // パネルの表示/非表示を切り替え
                if (savedGroupsPanel.style.display === 'none') {
                    savedGroupsPanel.style.display = 'block';
                    savedGroupsToggle.textContent = '保存済みグループを隠す ▲';
                } else {
                    savedGroupsPanel.style.display = 'none';
                    savedGroupsToggle.textContent = '保存済みグループを表示 ▼';
                }
            });
        }
        
        // 顧客名の変更時にプレビューを更新
        if (customerNameInput) {
            customerNameInput.addEventListener('change', () => {
                const name = customerNameInput.value.trim();
                if (name) {
                    // 既存の顧客情報があれば年齢を自動入力
                    const customers = Storage.getCustomers();
                    const customer = customers.find(c => c.name === name);
                    if (customer && customer.age && customerAgeInput) {
                        customerAgeInput.value = customer.age;
                    }
                }
                updatePreview();
            });
        }
        
        // 各入力欄の変更時にプレビューを更新
        [customerAgeInput, currentDateInput, reservationDateInput, reservationTimeInput].forEach(input => {
            if (input) {
                input.addEventListener('change', updatePreview);
            }
        });
        
        // 回線追加ボタンのイベント
        if (addLineButton) {
            addLineButton.addEventListener('click', () => {
                addLineRow();
                extractAndSaveNames();
            });
        }
        
        // 回線クリアボタンのイベント
        if (clearLinesButton) {
            clearLinesButton.addEventListener('click', () => {
                if (confirm('すべての回線情報をクリアしてもよろしいですか？')) {
                    if (elements.lineTableBody) elements.lineTableBody.innerHTML = '';
                    updatePreview();
                    extractAndSaveNames();
                }
            });
        }
        
        // グループ保存ボタンのイベント
        if (saveGroupButton) {
            saveGroupButton.addEventListener('click', saveGroup);
        }
        
        // 全てクリアボタンのイベント
        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => {
                if (confirm('すべての入力内容をクリアしてもよろしいですか？\nこの操作は元に戻せません。')) {
                    clearForm();
                }
            });
        }
        
        // 印刷ボタンのイベント
        if (printTableButton) {
            printTableButton.addEventListener('click', () => {
                try {
                    console.log('印刷機能の実行開始');
                    
                    // プレビュー更新
                    updatePreviewForGroup();
                    
                    // 印刷用コンテナにデータを複製
                    const printableArea = document.getElementById('printable-area');
                    const printContainer = document.getElementById('print-container');
                    if (!printableArea || !printContainer) {
                        console.error('印刷用エリアが見つかりません');
                        return;
                    }
                    
                    // 印刷用コンテナを初期化
                    printContainer.innerHTML = '';
                    printableArea.style.display = 'block';
                    
                    // プレビューテーブルを取得
                    const originalTable = document.getElementById('preview-table');
                    if (!originalTable) {
                        console.error('印刷対象のテーブルが見つかりません');
                        return;
                    }
                    
                    // 印刷用に新しいテーブルを作成
                    const printTable = originalTable.cloneNode(true);
                    printTable.id = 'print-only-table';
                    printTable.style.width = '100%';
                    printTable.style.maxWidth = '260mm'; // A4横幅より少し小さく
                    printTable.style.tableLayout = 'fixed';
                    printTable.style.pageBreakInside = 'avoid';
                    printTable.style.breakInside = 'avoid';
                    printTable.style.fontSize = '9pt'; // フォントサイズを小さく
                    printTable.style.height = 'auto';
                    printTable.style.maxHeight = '180mm'; // 高さ制限
                    printTable.className = 'avoid-page-break';
                    
                    // テーブルの周りにラッパーを作成
                    const wrapper = document.createElement('div');
                    wrapper.className = 'table-print-wrapper avoid-page-break';
                    wrapper.style.pageBreakInside = 'avoid';
                    wrapper.style.breakInside = 'avoid';
                    wrapper.style.height = 'auto';
                    wrapper.style.maxHeight = '180mm';
                    wrapper.style.overflow = 'hidden';
                    
                    // 印刷日時を追加
                    const printInfo = document.createElement('div');
                    printInfo.style.textAlign = 'right';
                    printInfo.style.fontSize = '7pt';
                    printInfo.style.padding = '2mm';
                    printInfo.style.margin = '0';
                    const now = new Date();
                    const dateTimeStr = now.toLocaleString('ja-JP');
                    printInfo.textContent = `出力日時: ${dateTimeStr}`;
                    
                    // ラッパーにテーブルと日時を追加
                    wrapper.appendChild(printTable);
                    wrapper.appendChild(printInfo);
                    
                    // 印刷用コンテナに追加
                    printContainer.appendChild(wrapper);
                    
                    // 印刷用スタイル追加
                    const printStyles = document.createElement('style');
                    printStyles.id = 'temporary-print-styles';
                    printStyles.textContent = `
                        @page {
                            size: landscape !important;
                            margin: 10mm !important;
                        }
                        @page :blank { display: none !important; }
                        
                        #print-only-table {
                            width: 210mm !important;
                            max-width: 210mm !important;
                            max-height: 260mm !important;
                            table-layout: fixed !important;
                            border-collapse: collapse !important;
                            overflow: hidden !important;
                            page-break-inside: avoid !important;
                            page-break-after: avoid !important;
                        }
                        #print-only-table th,
                        #print-only-table td {
                            border: 1px solid black !important;
                            padding: 2mm !important;
                            overflow: visible !important;
                            white-space: normal !important;
                            word-wrap: break-word !important;
                            max-height: 10mm !important;
                        }
                        #print-only-table th {
                            background-color: #e8e8e8 !important;
                            color: black !important;
                        }
                        #printable-area {
                            overflow: hidden !important;
                            max-height: 297mm !important;
                            height: 297mm !important;
                        }
                        body, html {
                            height: 297mm !important;
                            max-height: 297mm !important;
                            overflow: hidden !important;
                        }
                        @media print {
                            body:after { display: none !important; content: none !important; }
                            html:after { display: none !important; content: none !important; }
                        }
                    `;
                    document.head.appendChild(printStyles);
                    
                    // 印刷前に少し遅延を入れてレイアウトが反映されるようにする
                    console.log('印刷準備完了、印刷開始...');
                    
                    // 空白ページ抑制用の特殊要素を追加
                    const suppressBlankPages = document.createElement('style');
                    suppressBlankPages.id = 'suppress-blank-pages';
                    suppressBlankPages.innerHTML = `
                        @page:blank {
                            display: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            border: none !important;
                            visibility: hidden !important;
                        }
                        @media print {
                            html, body {
                                height: auto !important;
                                overflow: hidden !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            .avoid-page-break {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                        }
                    `;
                    document.head.appendChild(suppressBlankPages);
                    
                    setTimeout(() => {
                        window.print();
                        
                        // 印刷完了後にクリーンアップ
                        setTimeout(() => {
                            // 必要なクリーンアップ
                            printContainer.innerHTML = '';
                            printableArea.style.display = 'none';
                            const tempStyles = document.getElementById('temporary-print-styles');
                            if (tempStyles) {
                                tempStyles.remove();
                            }
                            const blankPageStyles = document.getElementById('suppress-blank-pages');
                            if (blankPageStyles) {
                                blankPageStyles.remove();
                            }
                            console.log('印刷処理完了');
                        }, 1000);
                    }, 800);
                } catch (error) {
                    console.error('印刷処理中にエラーが発生しました:', error);
                    alert('印刷処理中にエラーが発生しました: ' + error.message);
                }
            });
        }
        
        // グループ選択が変更されたときのイベント
        if (groupSelect) {
            groupSelect.addEventListener('change', () => {
                console.log('グループ選択変更:', groupSelect.value);
                updatePreviewForGroup();
            });
        }
        
        // PDF出力ボタンのイベント
        if (exportPdfButton) {
            exportPdfButton.addEventListener('click', () => {
                try {
                    console.log('PDF出力開始');
                    
                    // プレビューセクションを表示
                    const previewSection = document.querySelector('.preview-section');
                    if (previewSection) {
                        previewSection.style.display = 'block';
                    }
                    
                    updatePreviewForGroup();
                    // レイアウト最適化
                    optimizeColumnWidths();
                    
                    // PDF生成用の追加スタイル
                    const pdfStyles = document.createElement('style');
                    pdfStyles.id = 'pdf-export-styles';
                    pdfStyles.textContent = `
                        /* PDF生成時のレイアウト最適化 */
                        #preview-table { width: 640px !important; table-layout: fixed !important; }
                        #preview-table th, #preview-table td { overflow: hidden !important; text-overflow: ellipsis !important; }
                        .preview-section { page-break-after: avoid !important; }
                        body, html { height: auto !important; max-height: none !important; }
                    `;
                    document.head.appendChild(pdfStyles);
                    
                    // 少し遅延させてレイアウト調整が完了してから処理
                    setTimeout(() => {
                        const previewContainer = elements.previewContainer;
                        if (!previewContainer) {
                            console.error('プレビューコンテナが見つかりません');
                            alert('PDFを生成できません: プレビュー要素が見つかりません');
                            return;
                        }
                        
                        if (!PDFHelper) {
                            console.error('PDFヘルパーモジュールが見つかりません');
                            alert('PDF出力機能が正しく読み込まれていません');
                            return;
                        }
                        
                        // PDFヘルパーを使用してPDF生成
                        PDFHelper.generatePDF(previewContainer, elements.groupSelect.value, Storage.getGroup)
                            .then(success => {
                                if (success) {
                                    console.log('PDF生成成功');
                                }
                                
                                // 処理完了後にクリーンアップ
                                const pdfStylesElem = document.getElementById('pdf-export-styles');
                                if (pdfStylesElem) {
                                    pdfStylesElem.remove();
                                }
                                
                                // プレビューセクションを非表示に戻す
                                if (previewSection) {
                                    previewSection.style.display = 'none';
                                }
                            })
                            .catch(error => {
                                console.error('PDF生成エラー:', error);
                                alert('PDF出力処理に失敗しました: ' + error.message);
                                
                                // エラー時にもクリーンアップ
                                const pdfStylesElem = document.getElementById('pdf-export-styles');
                                if (pdfStylesElem) {
                                    pdfStylesElem.remove();
                                }
                            });
                    }, 800); // 遅延時間を増加
                } catch (error) {
                    console.error('PDF出力処理呼び出しエラー:', error);
                    alert('PDF出力処理の起動に失敗しました: ' + error.message);
                }
            });
        }
        
        // CSV出力ボタンのイベント
        if (exportCsvButton) {
            exportCsvButton.addEventListener('click', () => {
                try {
                    console.log('CSV出力開始');
                    
                    if (!PDFHelper) {
                        console.error('PDFヘルパーモジュールが見つかりません');
                        alert('CSV出力機能が正しく読み込まれていません');
                        return;
                    }
                    
                    // PDFヘルパーを使用してCSV生成
                    PDFHelper.generateCSV(elements.groupSelect.value, Storage.getGroup, Storage.getGroups)
                        .then(success => {
                            if (success) {
                                console.log('CSV生成成功');
                            }
                        })
                        .catch(error => {
                            console.error('CSV生成エラー:', error);
                            alert('CSV出力処理に失敗しました: ' + error.message);
                        });
                } catch (error) {
                    console.error('CSV出力処理呼び出しエラー:', error);
                    alert('CSV出力処理の起動に失敗しました: ' + error.message);
                }
            });
        }
    };
    
    // アプリケーション初期化
    try {
        console.log('アプリケーション初期化中...');
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // ページ読み込み時の初期化処理
        initializeCustomerList();
        initializeGroupList();
        
        // 名義入力用のdatalist要素を確保
        ['source-names-list', 'dest-names-list', 'users-list'].forEach(id => {
            const existing = document.getElementById(id);
            if (!existing) {
                const datalist = document.createElement('datalist');
                datalist.id = id;
                document.body.appendChild(datalist);
                console.log(`データリスト ${id} を作成しました`);
            }
        });
        
        // 名義リストの初期化
        const initializeNamesLists = () => {
            // 保存されている名義情報がある場合は抽出
            const savedNames = Storage.getNames();
            
            if (savedNames && savedNames.length > 0) {
                updateNamesList('source-names-list', savedNames);
                updateNamesList('dest-names-list', savedNames);
                updateNamesList('users-list', savedNames);
                console.log('保存済み名義情報を読み込みました:', savedNames.length, '件');
            } else {
                // 画面上の入力から名義情報を抽出
                extractAndSaveNames();
            }
            
            // 非表示セクションの隠し状態確認
            const previewSection = document.querySelector('.preview-section');
            if (previewSection) {
                previewSection.style.display = 'none';
            }
        };
        
        // 名義リストとグループ選択リストの初期化
        initializeNamesLists();
        updateGroupSelect();
        
        // 初期行の追加
        const lineTableBody = elements.lineTableBody;
        if (lineTableBody && lineTableBody.children.length === 0) {
            addLineRow();
        }
        
        // 列幅の最適化を初期化時にも行う
        optimizeColumnWidths();
        
        console.log('アプリケーション初期化完了');
    } catch (error) {
        console.error('アプリケーション初期化中にエラーが発生しました:', error);
        alert('アプリケーションの初期化中にエラーが発生しました。詳細はコンソールを確認してください。');
    }
});