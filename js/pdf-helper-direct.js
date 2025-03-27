/**
 * PDF出力サポート用ヘルパーモジュール
 * MNP契約情報管理表アプリケーション用
 * v3.0.0 - 直接描画方式
 */

// PDFヘルパーモジュール
const PDFHelper = (() => {
    
    /**
     * PDF出力を実行する関数
     * @param {HTMLElement} container - プレビュー表示用のHTML要素
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     */
    const generatePDF = async (container, selectedGroupId, getGroupFn) => {
        try {
            console.log('PDF生成処理開始 - 直接描画方式');
            
            if (!container) {
                console.error('コンテナ要素が見つかりません');
                throw new Error('プレビュー表示用の要素が見つかりません');
            }
            
            // jsPDFが利用可能か確認
            if (!window.jspdf || !window.jspdf.jsPDF) {
                console.error('jsPDFライブラリが見つかりません');
                throw new Error('PDF生成用のライブラリが読み込まれていません');
            }
            
            // PDFドキュメント作成（横向き、A4サイズ）
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // PDFのサイズ情報取得
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            console.log('PDF サイズ:', pdfWidth, 'x', pdfHeight, 'mm');
            
            // マージン設定
            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const startX = margin;
            let currentY = margin;
            
            // フォント設定
            doc.setFont('helvetica', 'normal');
            
            // グループデータの取得
            let group = null;
            if (selectedGroupId && typeof getGroupFn === 'function') {
                group = getGroupFn(selectedGroupId);
            }
            
            // 現在の入力データを取得
            const previewHeader = container.querySelector('#preview-header');
            const previewBody = container.querySelector('#preview-body');
            
            if (!previewHeader || !previewBody) {
                throw new Error('プレビューのヘッダーまたは本文が見つかりません');
            }
            
            // ヘッダー情報を取得
            const headerInfo = previewHeader.innerHTML;
            const headerText = previewHeader.textContent.trim();
            
            // ヘッダーをPDFに描画
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            
            // タイトル
            doc.setFontSize(16);
            doc.text('MNP契約情報管理表', pdfWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            
            // ヘッダー情報
            doc.setFontSize(12);
            
            // 顧客情報
            if (group) {
                const customerInfo = `名前: ${group.customerName || '-'} 年齢: ${group.customerAge || '-'}`;
                const dateParts = [];
                
                if (group.date) {
                    try {
                        dateParts.push(`日付: ${new Date(group.date).toLocaleDateString('ja-JP')}`);
                    } catch (e) {
                        dateParts.push('日付: -');
                    }
                }
                
                if (group.reservationDate) {
                    try {
                        let reservationStr = `予約希望日: ${new Date(group.reservationDate).toLocaleDateString('ja-JP')}`;
                        if (group.reservationTime) {
                            reservationStr += ` ${group.reservationTime}`;
                        }
                        dateParts.push(reservationStr);
                    } catch (e) {
                        dateParts.push('予約希望日: -');
                    }
                }
                
                doc.text(customerInfo, startX, currentY);
                
                // 日付情報
                if (dateParts.length) {
                    doc.text(dateParts.join(' '), pdfWidth - margin, currentY, { align: 'right' });
                }
            } else {
                // ヘッダーテキストを解析して表示
                doc.text(headerText, startX, currentY);
            }
            
            currentY += 10;
            
            // テーブルヘッダー
            const tableHeaders = [
                '電話番号', 'MNP予約番号', '移転元キャリア', '乗り換え元名義', '乗り換え先名義', '利用者', '関係'
            ];
            
            // 列幅の設定 (合計で100%になるよう調整)
            const colWidths = [
                contentWidth * 0.15, // 電話番号
                contentWidth * 0.17, // MNP予約番号
                contentWidth * 0.10, // 移転元キャリア
                contentWidth * 0.17, // 乗り換え元名義
                contentWidth * 0.17, // 乗り換え先名義
                contentWidth * 0.12, // 利用者
                contentWidth * 0.12  // 関係
            ];
            
            // テーブルヘッダーの背景色
            doc.setFillColor(220, 220, 220);
            doc.rect(startX, currentY, contentWidth, 8, 'F');
            
            // ヘッダーテキスト
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            let colX = startX;
            tableHeaders.forEach((header, index) => {
                doc.text(header, colX + 2, currentY + 5);
                colX += colWidths[index];
            });
            
            currentY += 8;
            
            // テーブル行の取得
            const rows = previewBody.querySelectorAll('tr');
            
            // 各行のデータを取得してPDFに描画
            doc.setFontSize(9);
            
            const rowHeight = 7;
            let rowCount = 0;
            
            // 行の描画関数
            const drawRow = (rowData) => {
                // 偶数行の背景色
                if (rowCount % 2 === 1) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(startX, currentY, contentWidth, rowHeight, 'F');
                }
                
                // 行のデータ
                let colX = startX;
                rowData.forEach((cellData, index) => {
                    doc.text(cellData, colX + 2, currentY + 5);
                    colX += colWidths[index];
                });
                
                // 縦線を描画
                colX = startX;
                for (let i = 0; i <= colWidths.length; i++) {
                    doc.line(colX, currentY, colX, currentY + rowHeight);
                    if (i < colWidths.length) colX += colWidths[i];
                }
                
                // 横線を描画
                doc.line(startX, currentY, startX + contentWidth, currentY);
                doc.line(startX, currentY + rowHeight, startX + contentWidth, currentY + rowHeight);
                
                currentY += rowHeight;
                rowCount++;
            };
            
            if (rows.length > 0) {
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 7) {
                        const rowData = Array.from(cells).map(cell => cell.textContent.trim());
                        drawRow(rowData);
                    }
                });
            } else if (group && group.lines) {
                // グループデータから直接描画
                group.lines.forEach((line, index) => {
                    const rowData = [
                        line.phoneNumber || '',
                        line.mnpNumber || '',
                        line.carrier || '',
                        `${index + 1}${line.sourceName || ''}`,
                        line.destName || '',
                        line.user || '',
                        line.relation === 'その他' ? `その他(${line.otherRelation || ''})` : line.relation || ''
                    ];
                    drawRow(rowData);
                });
            }
            
            // 最後の縦線を閉じる
            if (rowCount > 0) {
                doc.line(startX, currentY - rowHeight, startX, currentY);
                doc.line(startX + contentWidth, currentY - rowHeight, startX + contentWidth, currentY);
            }
            
            // フッター情報追加
            doc.setFontSize(8);
            const now = new Date();
            const footerText = `出力日時: ${now.toLocaleString('ja-JP')}`;
            const footerWidth = doc.getStringUnitWidth(footerText) * 8 / doc.internal.scaleFactor;
            doc.text(footerText, pdfWidth - margin - 2, pdfHeight - 5);
            
            // ファイル名生成（日付スタンプ付き）
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
            
            // 選択グループに基づくファイル名設定
            let fileName;
            
            if (group) {
                fileName = `MNP契約情報_${group.groupName || group.customerName || 'グループ'}_${timestamp}.pdf`;
            } else {
                fileName = `MNP契約情報_全体_${timestamp}.pdf`;
            }
            
            // PDF保存
            console.log('PDF保存:', fileName);
            doc.save(fileName);
            console.log('PDF生成完了');
            
            return true;
        } catch (error) {
            console.error('PDF出力処理エラー:', error);
            alert('PDF生成中にエラーが発生しました: ' + error.message);
            throw error;
        }
    };
    
    /**
     * CSV出力を実行する関数
     * @param {String} selectedGroupId - 選択中のグループID（未選択時は空文字）
     * @param {Function} getGroupFn - グループ情報取得用の関数
     * @param {Function} getGroupsFn - 全グループ情報取得用の関数
     */
    const generateCSV = (selectedGroupId, getGroupFn, getGroupsFn) => {
        try {
            console.log('CSV出力処理開始');
            
            // TextEncoderの存在確認
            if (!window.TextEncoder) {
                console.error('TextEncoderが見つかりません');
                throw new Error('CSV出力に必要なエンコーディング機能が利用できません');
            }
            
            let dataToExport = [];
            
            // 選択グループがある場合はそのグループのみ出力
            if (selectedGroupId && typeof getGroupFn === 'function') {
                const group = getGroupFn(selectedGroupId);
                console.log('選択グループデータ取得:', group ? 'OK' : 'Not Found');
                
                if (group && group.lines && group.lines.length > 0) {
                    dataToExport = createExportData(group);
                }
            } 
            // 選択グループがない場合は全グループを出力
            else if (typeof getGroupsFn === 'function') {
                const groups = getGroupsFn();
                console.log('全グループデータ取得:', groups?.length || 0, '件');
                
                if (groups && groups.length > 0) {
                    groups.forEach(group => {
                        if (group && group.lines && group.lines.length > 0) {
                            const groupData = createExportData(group);
                            dataToExport = [...dataToExport, ...groupData];
                        }
                    });
                }
            }
            
            if (dataToExport.length === 0) {
                console.log('出力するデータがありません');
                throw new Error('出力するデータがありません');
            }
            
            console.log('CSV出力データ作成:', dataToExport.length, '行');
            
            // CSVデータの作成
            const headers = Object.keys(dataToExport[0]);
            const rows = [
                headers.join(','),
                ...dataToExport.map(row => headers.map(header => {
                    const cell = row[header] || '';
                    return `"${cell.toString().replace(/"/g, '""')}"`;
                }).join(','))
            ];
            
            // CSVコンテンツ生成
            const csvContent = rows.join('\n');
            
            // UTF-8で出力するように変更
            console.log('エンコーディング処理開始');
            
            // UTF-8 BOMを作成
            const bomBuffer = new Uint8Array([0xEF, 0xBB, 0xBF]);
            
            // CSVデータをUTF-8でエンコード
            const textEncoder = new TextEncoder();
            const csvContentUtf8 = textEncoder.encode(csvContent);
            
            // BOMとCSV内容を結合
            const combinedArray = new Uint8Array(bomBuffer.length + csvContentUtf8.length);
            combinedArray.set(bomBuffer);
            combinedArray.set(csvContentUtf8, bomBuffer.length);
            
            // UTF-8エンコードでBlobを作成
            const blob = new Blob([combinedArray], {
                type: 'text/csv;charset=utf-8'
            });
            
            console.log('CSVデータエンコード完了');
            
            // ファイル名生成
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
            
            let fileName;
            if (selectedGroupId && typeof getGroupFn === 'function') {
                const selectedGroup = getGroupFn(selectedGroupId);
                fileName = selectedGroup ?
                    `MNP契約情報_${selectedGroup.groupName || selectedGroup.customerName || 'グループ'}_${timestamp}.csv` :
                    `MNP契約情報_${timestamp}.csv`;
            } else {
                fileName = `MNP契約情報_全体_${timestamp}.csv`;
            }
            
            // ダウンロード実行
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(link.href);
            
            console.log('CSV出力完了:', fileName);
            return true;
        } catch (error) {
            console.error('CSV出力処理エラー:', error);
            throw error;
        }
    };
    
    /**
     * 出力データを作成する内部関数
     * @param {Object} group - グループデータ
     * @returns {Array} 出力データの配列
     */
    const createExportData = (group) => {
        return group.lines.map((line, index) => {
            let groupDate, reservationDate;
            
            try {
                groupDate = group.date ? new Date(group.date).toLocaleDateString() : '';
            } catch (e) {
                console.error('日付変換エラー:', e);
                groupDate = '';
            }
            
            try {
                reservationDate = group.reservationDate ? new Date(group.reservationDate).toLocaleDateString() : '';
            } catch (e) {
                console.error('予約日付変換エラー:', e);
                reservationDate = '';
            }
            
            return {
                'グループ名': group.groupName || '',
                '日付': groupDate,
                '顧客名': group.customerName || '',
                '年齢': group.customerAge || '',
                '予約希望日': reservationDate,
                '予約希望時間': group.reservationTime || '',
                '電話番号': line.phoneNumber || '',
                'MNP予約番号': line.mnpNumber || '',
                '移転元キャリア': line.carrier || '',
                '乗り換え元名義': `${index + 1}${line.sourceName || ''}`,
                '乗り換え先名義': line.destName || '',
                '利用者': line.user || '',
                '関係': line.relation === 'その他' ? `その他(${line.otherRelation || ''})` : line.relation || ''
            };
        });
    };
    
    // 公開API
    return {
        generatePDF,
        generateCSV
    };
})();