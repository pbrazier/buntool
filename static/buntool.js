// Initialize PDF.js - used for page counts
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Initialize variables
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const progressBar = document.querySelector('.progress-bar');
const progressContainer = document.querySelector('.progress-container');
const bundleForm = document.getElementById('bundleForm');
const downloadButtonContainer = document.getElementById('downloadButtonContainer');
const downloadButton = document.getElementById('downloadButton');
const downloadZipButton = document.getElementById('downloadZipButton');
const coversheetInput = document.getElementById('coversheet');
const csvIndexInput = document.getElementById('csv_index');
const loadingIndicator = document.getElementById('loadingIndicator');

// Store original to sanitized filename mappings
let filenameMappings = new Map();
let uploadedFiles = new Map(); // Store File objects

// Initialize Sortable
new Sortable(fileList, {
    handle: '.drag-handle',
    animation: 150
});

// Event Listeners
dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});


function sanitizeFilename(filename) {
    let nameWithoutExt = filename;
    // Replace spaces and underscores with hyphens
    nameWithoutExt = nameWithoutExt.replace(/[\s_]+/g, '-');

    // Remove any other special characters
    nameWithoutExt = nameWithoutExt.replace(/[^a-zA-Z0-9-.]/g, '');

    return nameWithoutExt;
}

function getUniqueFilename(basename, extension, usedNames) {
    let candidate = basename + extension;
    let suffix = 1;
    while ([...usedNames.values()].includes(candidate)) {
        candidate = `${basename}-${suffix}${extension}`;
        suffix++;
    }
    return candidate;
}

// Supported file types (defaults — updated dynamically from server capabilities)
const PDF_TYPES = ['application/pdf'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];
let OFFICE_EXTENSIONS = []; // Populated from server if LibreOffice is available

// Check server capabilities on load
fetch('/capabilities')
    .then(r => r.json())
    .then(data => {
        const formatsText = document.getElementById('supportedFormatsText');
        if (data.libreoffice_available) {
            OFFICE_EXTENSIONS = ['.docx'];
            fileInput.accept = '.pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp,.docx';
            formatsText.textContent = 'Supports PDF, images (PNG, JPG, GIF, BMP, TIFF, WEBP) and Word documents (DOCX). Non-PDF files will be converted automatically.';
        } else {
            OFFICE_EXTENSIONS = [];
            fileInput.accept = '.pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp';
            formatsText.textContent = 'Supports PDF and images (PNG, JPG, GIF, BMP, TIFF, WEBP). Word documents require LibreOffice on the server.';
        }
        // AI feature visibility
        if (data.ai_available) {
            document.getElementById('aiButtonGroup').style.display = 'flex';
            const label = document.getElementById('aiProviderLabel');
            if (data.ai_provider) {
                label.textContent = `Using ${data.ai_provider.provider} (${data.ai_provider.model})`;
            }
        } else {
            document.getElementById('aiNotConfigured').style.display = 'block';
        }
    })
    .catch(() => {
        OFFICE_EXTENSIONS = [];
        fileInput.accept = '.pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp';
    });

function getFileExtension(filename) {
    return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

function isSupportedFile(file) {
    if (PDF_TYPES.includes(file.type)) return true;
    if (IMAGE_TYPES.includes(file.type)) return true;
    const ext = getFileExtension(file.name);
    if (OFFICE_EXTENSIONS.includes(ext)) return true;
    return false;
}

function isPDF(file) {
    return file.type === 'application/pdf';
}

async function convertFileToPDF(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/convert', { method: 'POST', body: formData });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Conversion failed' }));
        throw new Error(err.message || 'Conversion failed');
    }
    // Check if the server flagged this as a lossy fallback conversion
    if (response.headers.get('X-Conversion-Warning') === 'fallback') {
        showError(`⚠️ ${file.name}: Converted using text extraction (LibreOffice not installed on server). Formatting, tables, and images may be lost. For legally accurate conversion, install LibreOffice or convert to PDF before uploading.`);
    }
    const blob = await response.blob();
    const pdfName = file.name.slice(0, file.name.lastIndexOf('.')) + '.pdf';
    return new File([blob], pdfName, { type: 'application/pdf' });
}

async function handleFiles(files) {
    progressContainer.style.display = 'block';
    const totalFiles = files.length;
    let processedFiles = 0;
    let successful_uploads = 0;
    let unsuccessful_uploads = 0;

    for (let file of files) {
        if (!isSupportedFile(file)) {
            showError(`${file.name} is not a supported file type`);
            continue;
        }

        if (uploadedFiles.has(file.name)) {
            showDuplicateModal(file.name);
            continue;
        }

        try {
            let pdfFile = file;
            let wasConverted = false;

            // Convert non-PDF files to PDF via the server
            if (!isPDF(file)) {
                pdfFile = await convertFileToPDF(file);
                wasConverted = true;
            }

            let extension = pdfFile.name.slice(pdfFile.name.lastIndexOf('.'));
            let baseName = file.name.slice(0, file.name.lastIndexOf('.'));
            let sanitizedBase = sanitizeFilename(baseName);
            let sanitizedName = baseName + extension;
            filenameMappings.set(file.name, sanitizedName);
            uploadedFiles.set(file.name, pdfFile); // Store the (possibly converted) PDF File object

            await processPDFFile(pdfFile, sanitizedName, baseName, wasConverted ? file.name : null);
            processedFiles++;
            progressBar.style.width = `${(processedFiles / totalFiles) * 100}%`;
            successful_uploads++;
        } catch (error) {
            showError(`Error processing ${file.name}: ${error.message}`);
            unsuccessful_uploads++;
        }
    }

    if (successful_uploads > 0) {
        showMessage(`${successful_uploads} files uploaded successfully.`);
        document.getElementById('file-table').style.display = 'block'; // Make file-table visible
        sortTableByFilename(); // Auto-sort by filename after upload
    }
    if (unsuccessful_uploads > 0)
        showError(`${unsuccessful_uploads} files failed to upload.`);

    setTimeout(() => {
        progressContainer.style.display = 'none';
        progressBar.style.width = '0';
    }, 1000);
}

async function processPDFFile(file, sanitizedFileName, originalBasename, convertedFrom = null) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;

        addFileToList({
            originalName: convertedFrom || file.name,
            sanitizedName: sanitizedFileName,
            title: prettifyTitle(originalBasename),
            date: new Date(file.lastModified).toISOString().split('T')[0],
            pages: pageCount,
            converted: !!convertedFrom
        });
    } catch (error) {
        throw new Error('Failed to process PDF file');
    }
}

function addFileToList(fileData) {
    console.log("Adding file to list:", fileData);
    const row = document.createElement('tr');
    const parsedResult = parseDateFromFilename(fileData.originalName, fileData.title);
    console.log("Parsed result:", parsedResult.date, parsedResult.titleWithoutDate);
    const dateToDisplay = parsedResult.date ? parsedResult.date : fileData.date;
    const titleToDisplay = parsedResult.titleWithoutDate || fileData.title;
    const convertedBadge = fileData.converted ? ' <span style="background-color: #ef8c51; color: white; padding: 0.1rem 0.3rem; border-radius: 0.2rem; font-size: 0.7rem;">converted</span>' : '';
    
    row.innerHTML = `
        <td><div class="drag-handle"><span style="background-color: #68b3cd; color: white; padding: 0.2rem 0.5rem; border-radius: 0.3rem;">☰</span></div></td>
        <td data-original-name="${fileData.originalName}">${fileData.sanitizedName}${convertedBadge}</td>
        <td><input type="text" value="${titleToDisplay}" class="w-full"></td>
        <td><input type="text" value="${dateToDisplay}" class="w-full"></td>
        <td>${fileData.pages}</td>
        <td><button type="button" class="remove-button" onclick="removeFile(this, '${fileData.originalName}')">❌</button></td>
    `;
    fileList.appendChild(row);
}

function removeFile(button, originalName) {
    const row = button.closest('tr');
    row.remove();
    uploadedFiles.delete(originalName);
    console.log(`Removed file: ${originalName}`);
}

function addSection() {
    const row = document.createElement('tr');
    row.className = 'section-row';
    row.innerHTML = `
        <td><div class="drag-handle"><span style="background-color: #68b3cd; color: white; padding: 0.2rem 0.5rem; border-radius: 0.3rem;">☰</span></div></td>
        <td colspan="4"><input type="text" placeholder="Enter Section Name e.g. Part 1: Pleadings [drag to position]" class="w-full"></td>
        <td><button type="button" class="remove-button" onclick="this.closest('tr').remove()">❌</button></td>
    `;
    fileList.insertBefore(row, fileList.firstChild);
    row.classList.add('flash');
    setTimeout(() => row.classList.remove('flash'), 500);
}

function prettifyTitle(title) {
    // Replace multiple underscores with a single space
    title = title.replace(/_+/g, ' ');
    // Remove any character that is not a word character, space, or period
    title = title.replace(/[^\p{L}\p{N}\p{P}\p{S}\p{Z}]/gu, ''); // Unicode-aware regex: L is letter, N is number, P is punctuation, S is symbol, Z is separator
    return title.trim();
}

function generateCSVContent() {
    console.log("Generating CSV content");
    let csvContent = 'filename,title,date,section\n';
    let sectionCounter = 0;

    const rows = fileList.querySelectorAll('tr');
    console.log("Number of rows found:", rows.length);
    rows.forEach(row => {
        console.log("Processing row:", row);
        if (row.classList.contains('section-row')) {
            sectionCounter++;
            const sectionInput = row.querySelector('input');
            const title = sectionInput ? sectionInput.value.trim() : '';
            const prettifiedTitle = prettifyTitle(title);
            csvContent += `SECTION_BREAK_${sectionCounter},${escapeCsvField(prettifiedTitle)},,1\n`;
        } else {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                // Use sanitized filename from the filenameMappings map
                const originalFilename = cells[1].getAttribute('data-original-name')
                const sanitizedFilename = filenameMappings.get(originalFilename) || originalFilename;
                const title = cells[2].querySelector('input')?.value.trim() || '';
                const date = cells[3].querySelector('input')?.value || '';
                const prettifiedTitle = prettifyTitle(title);
                csvContent += [
                    escapeCsvField(sanitizedFilename),
                    escapeCsvField(prettifiedTitle),
                    escapeCsvField(date),
                    '0' // File row section flag
                ].join(',') + '\n';
            }
        }
    });
    console.log("Final CSV content:", csvContent);
    return csvContent;
}

function escapeCsvField(field) {
    if (!field) return '';
    // If the field contains commas, quotes, or newlines, wrap it in quotes and escape existing quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}
bundleForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearProcessErrorMessages();
    clearZipExplainer();
    document.getElementById('downloadButtonContainer').style.display = 'none';
    document.getElementById('loadingIndicator').style.display = 'block';
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="mdi mdi-loading mdi-spin"></i> Creating Bundle...';
    submitButton.disabled = true;
    loadingIndicator.style.display = 'block';

    const formData = new FormData(this);

    // Clear any existing file entries
    for (let key of formData.keys()) {
        if (key === 'files') {
            formData.delete(key);
        }
    }

    // Add files in the order they appear in the sortable list
    const rows = fileList.querySelectorAll('tr');
    rows.forEach(row => {
        if (!row.classList.contains('section-row')) {
            const originalName = row.querySelector('td[data-original-name]').dataset.originalName;
            const file = uploadedFiles.get(originalName);
            if (file) {
                const sanitizedName = filenameMappings.get(originalName);
                if (sanitizedName) {
                    const sanitizedFile = new File([file], sanitizedName, {
                        type: file.type,
                        lastModified: file.lastModified
                    });
                    formData.append('files', sanitizedFile);
                }
            }
        }
    });
    // Generate and append the CSV file
    const csvContent = generateCSVContent();
    const csvBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const csvFile = new File([csvBlob], 'index.csv', {
        type: 'text/csv',
        lastModified: new Date().getTime()
    });

    formData.delete('csv_index');
    formData.append('csv_index', csvFile, 'index.csv');


    fetch('/create_bundle', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                showProcessMessage('Bundle created successfully!', 'success');
                downloadButtonContainer.style.display = 'block';
                downloadButton.onclick = () => {
                    window.location.href = `/download/bundle?path=${encodeURIComponent(data.bundle_path)}`;
                };
                downloadZipButton.onclick = () => {
                    window.location.href = `/download/zip?path=${encodeURIComponent(data.zip_path)}`;
                };
                showZipExplainer('You can download just the PDF bundle, or you can download a Zip file. The Zip packages everything together for filing (and later editing), plus a separate draft index in Word (docx) format.')
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        })
        .catch(error => {
            showProcessError(`Failed to create bundle: ${error.message}`);
        })
        .finally(() => {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            loadingIndicator.style.display = 'none';
        });
});

function showDuplicateModal(filename) {
    const modal = document.getElementById('duplicateModal');
    const message = document.getElementById('duplicateMessage');
    message.innerHTML = `<b>Duplicate file detected</b> <br><br> Did you mean to upload the file <i>'${filename}'</i> more than once?<br><br>Buntool has detected multiple copies of the same filename. This is usually a mistake, so BunTool will ignore the second copy for now. <br><br>If you do want to add the file twice, just make a copy of it with a different filename, and upload that.`;
    modal.style.display = 'flex';
}

function closeDuplicateModal() {
    const modal = document.getElementById('duplicateModal');
    modal.style.display = 'none';
}

function clearAllFiles() {
    fileList.innerHTML = '';
    fileInput.value = '';
    filenameMappings.clear();
    uploadedFiles.clear(); // Clear stored files
}

function clearCoversheet() {
    document.getElementById('coversheetInput').value = '';
}

function clearCSVIndex() {
    csvIndexInput.value = '';
}

function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `success-message`;
    messageDiv.innerHTML = `<i class="mdi mdi-check-circle"></i>${message}`;
    document.getElementById('errorContainer').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="mdi mdi-alert-circle"></i>${message}`;
    document.getElementById('errorContainer').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showProcessMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `success-message`;
    messageDiv.innerHTML = `<i class="mdi mdi-check-circle"></i>${message}`;
    document.getElementById('processErrorContainer').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
}

function showProcessError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="mdi mdi-alert-circle"></i>${message}`;
    document.getElementById('processErrorContainer').appendChild(errorDiv);
    // setTimeout(() => errorDiv.remove(), 5000);
}

function showZipExplainer(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `success-message`;
    messageDiv.innerHTML = `<i class="mdi mdi-check-circle"></i>${message}`;
    document.getElementById('zipExplainerContainer').appendChild(messageDiv);
    //setTimeout(() => messageDiv.remove(), 5000);
}

function clearProcessErrorMessages() {
    const processErrorContainer = document.getElementById('processErrorContainer');
    processErrorContainer.innerHTML = '';
}

function clearZipExplainer() {
    const zipExplainerContainer = document.getElementById('zipExplainerContainer');
    zipExplainerContainer.innerHTML = '';
}
function parseDateFromFilename(filename, title) {
    console.log("Parsing date and cleaning title. Input:", { filename, title });
    let titleWithoutDate = title;
    let matchedDate = null;

    // Check for filenames that start with YYYY-MM-DD or DD-MM-YYYY
    const year_first_regex = /[\[\(]{0,1}(1\d{3}|20\d{2})[-._]?(0[1-9]|1[0-2])[-._]?(0[1-9]|[12][0-9]|3[01])[\]\)]{0,1}/;
    const year_last_regex = /[\[\(]{0,1}(0[1-9]|[12][0-9]|3[01])[-._]?(0[1-9]|1[0-2])[-._]?(1\d{3}|20\d{2})[\]\)]{0,1}/;
    
    const year_first_match = filename.match(year_first_regex);
    if (year_first_match) {
        const [fullMatch, year, month, day] = year_first_match;
        const parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
        matchedDate = parsedDate.toISOString().split('T')[0];
        
        if (titleWithoutDate) {
            // Remove the matched date (including any brackets) and trim remaining separators
            titleWithoutDate = titleWithoutDate.replace(fullMatch, '').replace(/^[\s-_]+|[\s-_]+$/g, '');
        }
        console.log("Year-first match found:", { matchedDate, titleWithoutDate });
        return { date: matchedDate, titleWithoutDate };
    }

    const year_last_match = filename.match(year_last_regex);
    if (year_last_match) {
        const [fullMatch, day, month, year] = year_last_match;
        const parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
        matchedDate = parsedDate.toISOString().split('T')[0];
        
        if (titleWithoutDate) {
            // Remove the matched date (including any brackets) and trim remaining separators
            titleWithoutDate = titleWithoutDate.replace(fullMatch, '').replace(/^[\s-_]+|[\s-_]+$/g, '');
        }
        console.log("Year-last match found:", { matchedDate, titleWithoutDate });
        return { date: matchedDate, titleWithoutDate };
    }

    // Fall back to chrono-node for natural language processing
    const chrono_parsedDate = chrono.strict.parseDate(filename);
    if (chrono_parsedDate) {
        matchedDate = chrono_parsedDate.toISOString().split('T')[0];
        // Note: With chrono, we don't attempt to clean the title as we don't know exactly what text matched
        console.log("Chrono date found:", { matchedDate, titleWithoutDate });
        return { date: matchedDate, titleWithoutDate };
    }

    console.log("No date found, returning:", { date: null, titleWithoutDate });
    return { date: null, titleWithoutDate };
}

function sortTableByFilename() {
    // Auto-sort non-section rows by filename (column index 1) ascending
    const table = document.getElementById('fileList');
    const rows = Array.from(table.getElementsByTagName('tr'));
    const sortedRows = rows.sort((a, b) => {
        if (a.classList.contains('section-row')) return -1;
        if (b.classList.contains('section-row')) return 1;
        const aValue = a.getElementsByTagName('td')[1]?.textContent || '';
        const bValue = b.getElementsByTagName('td')[1]?.textContent || '';
        return aValue.localeCompare(bValue);
    });
    sortedRows.forEach(row => table.appendChild(row));
}

function sortTable(columnIndex) {
    const table = document.getElementById('fileList');
    const rows = Array.from(table.getElementsByTagName('tr'));
    const headers = document.querySelectorAll('th.sortable');
    const currentHeader = headers[columnIndex - 2]; // Adjust for first two non-sortable columns
    
    // Determine sort direction
    const isAsc = !currentHeader.classList.contains('asc');
    
    // Reset other headers
    headers.forEach(header => {
        header.classList.remove('asc', 'desc');
    });
    
    // Set current header sort direction
    currentHeader.classList.toggle('asc', isAsc);
    currentHeader.classList.toggle('desc', !isAsc);

    // Sort rows, excluding section rows
    const sortedRows = rows.sort((a, b) => {
        // Don't sort section rows
        if (a.classList.contains('section-row')) return -1;
        if (b.classList.contains('section-row')) return 1;

        const aValue = a.getElementsByTagName('td')[columnIndex].querySelector('input')?.value || '';
        const bValue = b.getElementsByTagName('td')[columnIndex].querySelector('input')?.value || '';

        if (columnIndex === 3) { // Date column
            // Parse dates (assuming YYYY-MM-DD format)
            const aDate = aValue ? new Date(aValue) : new Date(0);
            const bDate = bValue ? new Date(bValue) : new Date(0);
            return isAsc ? aDate - bDate : bDate - aDate;
        } else {
            // Regular string comparison
            return isAsc ? 
                aValue.localeCompare(bValue) : 
                bValue.localeCompare(aValue);
        }
    });

    // Reorder the table
    sortedRows.forEach(row => table.appendChild(row));
}


// ==================== AI Features ====================

function getFileListForAI() {
    const rows = fileList.querySelectorAll('tr:not(.section-row)');
    const files = [];
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            const originalName = cells[1].getAttribute('data-original-name');
            const sanitizedName = filenameMappings.get(originalName) || originalName;
            const title = cells[2].querySelector('input')?.value.trim() || '';
            files.push({ filename: sanitizedName, title: title });
        }
    });
    return files;
}

function setAIButtonsLoading(loading) {
    const catBtn = document.getElementById('aiCategoriseBtn');
    const renBtn = document.getElementById('aiRenameBtn');
    if (loading) {
        catBtn.disabled = true;
        renBtn.disabled = true;
        catBtn.innerHTML = '<i class="mdi mdi-loading mdi-spin"></i> Thinking...';
        renBtn.innerHTML = '<i class="mdi mdi-loading mdi-spin"></i> Thinking...';
    } else {
        catBtn.disabled = false;
        renBtn.disabled = false;
        catBtn.innerHTML = '<i class="mdi mdi-brain"></i> AI: Suggest Sections';
        renBtn.innerHTML = '<i class="mdi mdi-brain"></i> AI: Suggest Names';
    }
}

async function aiCategorise() {
    const files = getFileListForAI();
    if (files.length === 0) {
        showError('Upload some files first before using AI categorisation.');
        return;
    }

    setAIButtonsLoading(true);
    try {
        const response = await fetch('/ai/categorise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: files })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'AI request failed');
        }
        applyAISections(result.data);
        showMessage('AI section suggestions applied. Review and adjust as needed.');
    } catch (error) {
        showError(`AI categorisation failed: ${error.message}`);
    } finally {
        setAIButtonsLoading(false);
    }
}

function applyAISections(data) {
    if (!data || !data.sections) return;

    // Remove existing section rows
    fileList.querySelectorAll('tr.section-row').forEach(row => row.remove());

    // Collect all file rows into a lookup by sanitized filename
    const fileRows = {};
    fileList.querySelectorAll('tr:not(.section-row)').forEach(row => {
        const originalName = row.querySelector('td[data-original-name]')?.dataset.originalName;
        const sanitizedName = filenameMappings.get(originalName) || originalName;
        if (sanitizedName) fileRows[sanitizedName] = row;
    });

    // Clear the table and rebuild in section order
    fileList.innerHTML = '';
    const placed = new Set();

    data.sections.forEach(section => {
        // Add section header row
        const sectionRow = document.createElement('tr');
        sectionRow.className = 'section-row';
        sectionRow.innerHTML = `
            <td><div class="drag-handle"><span style="background-color: #68b3cd; color: white; padding: 0.2rem 0.5rem; border-radius: 0.3rem;">☰</span></div></td>
            <td colspan="4"><input type="text" value="${section.name}" class="w-full"></td>
            <td><button type="button" class="remove-button" onclick="this.closest('tr').remove()">❌</button></td>
        `;
        fileList.appendChild(sectionRow);

        // Add file rows for this section
        (section.files || []).forEach(filename => {
            const row = fileRows[filename];
            if (row) {
                fileList.appendChild(row);
                placed.add(filename);
            }
        });
    });

    // Append any files that weren't placed by the AI
    Object.entries(fileRows).forEach(([name, row]) => {
        if (!placed.has(name)) {
            fileList.appendChild(row);
        }
    });
}

async function aiRename() {
    const files = getFileListForAI();
    if (files.length === 0) {
        showError('Upload some files first before using AI renaming.');
        return;
    }

    setAIButtonsLoading(true);
    try {
        const response = await fetch('/ai/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: files })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'AI request failed');
        }
        applyAIRenames(result.data);
        showMessage('AI name suggestions applied to title fields. Review and adjust as needed.');
    } catch (error) {
        showError(`AI rename failed: ${error.message}`);
    } finally {
        setAIButtonsLoading(false);
    }
}

function applyAIRenames(data) {
    if (!data || !data.suggestions) return;

    // Build a lookup from original filename to suggested name
    const suggestions = {};
    data.suggestions.forEach(s => {
        suggestions[s.original] = s.suggested;
    });

    // Apply to table rows
    fileList.querySelectorAll('tr:not(.section-row)').forEach(row => {
        const originalName = row.querySelector('td[data-original-name]')?.dataset.originalName;
        const sanitizedName = filenameMappings.get(originalName) || originalName;
        const suggested = suggestions[sanitizedName];
        if (suggested) {
            const titleInput = row.querySelectorAll('td')[2]?.querySelector('input');
            if (titleInput) titleInput.value = suggested;
        }
    });
}
