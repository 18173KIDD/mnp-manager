/**
 * PDF出力サポート用ヘルパーモジュール
 * MNP契約情報管理表アプリケーション用
 * v1.0.0
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
            console.log('PDF生成処理開始');
            
            if (!container) {
                console.error('コンテナ要素が見つかりません');
                throw new Error('プレビュー表示用の要素が見つかりません');
            }
            
            // プレビューコンテナを表示状態に
            container.parentElement.style.display = 'block';
            
            // PDF出力用に幅を最大化
            const previewTable = container.querySelector('#preview-table');
            if (previewTable) {
                previewTable.style.width = '100%';
                previewTable.style.maxWidth = '100%';
                
                // 各列の幅を最適化
                const headerCells = previewTable.querySelectorAll('thead tr:last-child th');
                if (headerCells.length === 7) {
                    const columnWidths = ['15%', '17%', '12%', '15%', '15%', '12%', '14%'];
                    headerCells.forEach((cell, index) => {
                        if (index < columnWidths.length) {
                            cell.style.width = columnWidths[index];
                        }
                    });
                }
                
                // 各セルの表示を最適化
                const allCells = previewTable.querySelectorAll('th, td');
                allCells.forEach(cell => {
                    cell.style.overflow = 'visible';
                    cell.style.whiteSpace = 'normal';
                    cell.style.wordWrap = 'break-word';
                    cell.style.textOverflow = 'clip';
                });
            }
            
            // HTML2Canvas でテーブルをキャプチャ
            console.log('HTML2Canvas 処理開始');
            const canvas = await html2canvas(container, {
                scale: 2, // 高画質化のため倍率を上げる
                useCORS: true,
                logging: false,
                allowTaint: true,
                foreignObjectRendering: true,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                width: container.offsetWidth,
                height: container.offsetHeight
            });
            
            console.log('Canvas生成完了', canvas.width, 'x', canvas.height);
            
            try {
                // jsPDFが利用可能か確認
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    console.error('jsPDFライブラリが見つかりません', window.jspdf);
                    throw new Error('PDF生成用のライブラリが読み込まれていません');
                }
                
                // PDFドキュメント作成（横向き、A4サイズ）
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4',
                    compress: true, // ファイルサイズ最適化
                    putOnlyUsedFonts: true, // 使用するフォントのみ埋め込み
                    hotfixes: ['px_scaling'], // スケーリング修正
                    floatPrecision: 16 // 浮動小数点精度を高める
                });
                
                // 1ページ目のみ作成するように設定
                doc.setProperties({
                    title: 'MNP契約情報管理表',
                    subject: 'MNP契約情報',
                    creator: 'MNP契約情報管理アプリ',
                    keywords: 'MNP,契約情報',
                    noPagesPrompt: true, // ページプロンプトを表示しない
                });
                
                // PDFのサイズ情報取得
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = doc.internal.pageSize.getHeight();
                console.log('PDF サイズ:', pdfWidth, 'x', pdfHeight, 'mm');
                
                // キャンバスとPDFのアスペクト比調整
                const canvasRatio = canvas.width / canvas.height;
                const pdfRatio = pdfWidth / pdfHeight;
                
                // PDFにフィットするサイズ計算（余白10mm確保）
                const margin = 10;
                let renderWidth = pdfWidth - (margin * 2);
                let renderHeight = pdfHeight - (margin * 2);
                
                if (canvasRatio > pdfRatio) {
                    renderHeight = renderWidth / canvasRatio;
                } else {
                    renderWidth = renderHeight * canvasRatio;
                }
                
                // 中央配置のための座標計算
                const x = (pdfWidth - renderWidth) / 2;
                const y = (pdfHeight - renderHeight) / 2;
                
                // PDFの属性設定
                doc.setProperties({
                    title: 'MNP契約情報管理表',
                    creator: 'MNP契約情報管理アプリ',
                    subject: 'MNP契約情報',
                });
                
                // キャンバスを画像データに変換 - 高品質化
                console.log('キャンバスをPNG画像に変換');
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                // PDFに画像を追加
                console.log('PDFに画像データを追加');
                doc.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
                
                // 空白ページ生成を防止するための設定
                doc.setPage(1);
                
                // 一定ページ目以降を削除する
                if (doc.getNumberOfPages() > 1) {
                    for (let i = doc.getNumberOfPages(); i > 1; i--) {
                        doc.deletePage(i);
                    }
                }
                
                // フッター情報追加
                doc.setFontSize(8);
                const now = new Date();
                const footerText = `出力日時: ${now.toLocaleString('ja-JP')}`;
                const footerWidth = doc.getStringUnitWidth(footerText) * 8 / doc.internal.scaleFactor;
                doc.text(footerText, pdfWidth - footerWidth - 10, pdfHeight - 5);
                
                // ファイル名生成（日付スタンプ付き）
                const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
                
                // 選択グループに基づくファイル名設定
                let fileName;
                
                if (selectedGroupId && typeof getGroupFn === 'function') {
                    const selectedGroup = getGroupFn(selectedGroupId);
                    fileName = selectedGroup ?
                        `MNP契約情報_${selectedGroup.groupName || selectedGroup.customerName || 'グループ'}_${timestamp}.pdf` :
                        `MNP契約情報_${timestamp}.pdf`;
                } else {
                    fileName = `MNP契約情報_全体_${timestamp}.pdf`;
                }
                
                // PDF保存
                console.log('PDF保存:', fileName);
                doc.save(fileName);
                console.log('PDF生成完了');
                
                return true;
            } catch (pdfError) {
                console.error('PDF生成中にエラーが発生しました:', pdfError);
                throw pdfError;
            } finally {
                // 処理完了後はプレビュー要素を非表示に戻す
                container.parentElement.style.display = 'none';
            }
        } catch (error) {
            console.error('PDF出力処理エラー:', error);
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