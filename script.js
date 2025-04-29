const apiKey = 'AIzaSyDwDOhGVjnZAGaXzBQXX6NXILV7qv7LXpc'; // Ganti dengan API Key Gemini dari Google
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
let uploadedFiles = [];

// Muat riwayat dari localStorage dan tampilkan di sidebar
const loadHistory = () => {
  console.log('Memuat riwayat dari localStorage');
  const history = JSON.parse(localStorage.getItem('nexoraHistory')) || [];
  const historyList = document.getElementById('historyList');
  if (!historyList) {
    console.error('Elemen historyList tidak ditemukan');
    alert('Error: historyList tidak ditemukan. Periksa HTML.');
    return;
  }
  const filterText = document.getElementById('historyFilter')?.value.toLowerCase() || '';
  const dateFilter = document.getElementById('dateFilter')?.value || 'all';
  const now = new Date();
  historyList.innerHTML = '';
  const filteredHistory = history.filter(item => {
    const matchesText = item.prompt.toLowerCase().includes(filterText) || item.response.toLowerCase().includes(filterText);
    const itemDate = new Date(item.timestamp || Date.now());
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = itemDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      matchesDate = itemDate >= oneWeekAgo;
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      matchesDate = itemDate >= oneMonthAgo;
    }
    return matchesText && matchesDate;
  });
  filteredHistory.forEach((item, index) => {
    const historyItem = document.createElement('div');
    historyItem.className = 'bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition relative';
    historyItem.setAttribute('role', 'listitem');
    historyItem.setAttribute('tabindex', '0');
    historyItem.innerHTML = `
      <div class="font-dm-sans text-sm font-medium text-white mb-1 line-clamp-2">${item.prompt}</div>
      <div class="text-xs text-gray-400 line-clamp-3">${item.response}</div>
      <button class="absolute top-2 right-2 text-red-500 hover:text-red-600 transition history-delete" onclick="deleteHistory(${index})" title="Hapus Riwayat" aria-label="Hapus riwayat ini">
        <i class="fas fa-trash" aria-hidden="true"></i>
      </button>
    `;
    historyItem.addEventListener('click', (e) => {
      if (!e.target.closest('.history-delete')) {
        addChat(item.prompt, item.response, item.files);
      }
    });
    historyItem.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!e.target.closest('.history-delete')) {
          addChat(item.prompt, item.response, item.files);
        }
      }
    });
    historyList.appendChild(historyItem);
  });
};

// Hapus semua riwayat
const clearAllChat = () => {
  console.log('Menghapus semua riwayat');
  const responseOutput = document.getElementById('responseOutput');
  const historyList = document.getElementById('historyList');
  if (!responseOutput || !historyList) {
    console.error('Elemen responseOutput atau historyList tidak ditemukan');
    alert('Error: responseOutput atau historyList tidak ditemukan.');
    return;
  }
  historyList.style.animation = 'fadeOut 0.3s ease';
  historyList.addEventListener('animationend', () => {
    localStorage.removeItem('nexoraHistory');
    responseOutput.innerHTML = '';
    historyList.innerHTML = '';
    historyList.style.animation = '';
    document.getElementById('inputArea').classList.remove('bottom');
    document.getElementById('chatArea').classList.remove('active');
  }, { once: true });
};

// Mulai chat baru
const newChat = () => {
  console.log('Memulai chat baru');
  const responseOutput = document.getElementById('responseOutput');
  if (!responseOutput) {
    console.error('Elemen responseOutput tidak ditemukan');
    alert('Error: responseOutput tidak ditemukan.');
    return;
  }
  responseOutput.style.animation = 'fadeOut 0.3s ease';
  responseOutput.addEventListener('animationend', () => {
    responseOutput.innerHTML = '';
    responseOutput.style.animation = '';
  }, { once: true });
  document.getElementById('promptInput').value = '';
  uploadedFiles = [];
  updateFileList();
};

// Hapus entri riwayat
const deleteHistory = (index) => {
  console.log(`Menghapus riwayat indeks ${index}`);
  const history = JSON.parse(localStorage.getItem('nexoraHistory')) || [];
  const historyList = document.getElementById('historyList');
  if (!historyList.children[index]) {
    console.error(`Elemen riwayat indeks ${index} tidak ditemukan`);
    return;
  }
  const historyItem = historyList.children[index];
  historyItem.style.animation = 'fadeOut 0.3s ease';
  historyItem.addEventListener('animationend', () => {
    history.splice(index, 1);
    localStorage.setItem('nexoraHistory', JSON.stringify(history));
    loadHistory();
  }, { once: true });
};

// Simpan riwayat ke localStorage
const saveHistory = (prompt, response, files) => {
  console.log('Menyimpan riwayat:', { prompt, response, files });
  const history = JSON.parse(localStorage.getItem('nexoraHistory')) || [];
  history.unshift({ prompt, response, files, timestamp: Date.now() });
  localStorage.setItem('nexoraHistory', JSON.stringify(history));
  loadHistory();
};

// Tambahkan obrolan ke area chat
const addChat = (prompt, response, files = [], isError = false, isProcessing = false) => {
  console.log('Menambahkan chat:', { prompt, response, isError, isProcessing });
  const responseOutput = document.getElementById('responseOutput');
  if (!responseOutput) {
    console.error('Elemen responseOutput tidak ditemukan');
    alert('Error: responseOutput tidak ditemukan.');
    return;
  }
  const chatBubble = document.createElement('div');
  chatBubble.className = `chat-bubble max-w-[70%] p-3 rounded-xl flex items-start gap-2 relative z-10 ${isError ? 'bg-blue-600 text-white self-end user' : 'bg-blue-100 text-gray-900 self-start ai'}`;
  chatBubble.setAttribute('role', 'listitem');
  if (isProcessing) {
    chatBubble.id = 'processingBubble';
    chatBubble.className = `chat-bubble max-w-[70%] p-3 rounded-xl flex items-start gap-2 relative z-10 bg-blue-100 text-gray-900 self-start ai`;
  }
  
  let content = '';
  if (isError || isProcessing) {
    content = prompt;
  } else {
    content = marked.parse(response);
  }

  let promptContent = prompt || '';
  if (files && files.length > 0) {
    files.forEach(file => {
      if (file.type === 'image') {
        promptContent += `<br><img src="${file.data}" alt="${file.name}" class="max-w-[200px] rounded-lg">`;
      } else if (file.name.endsWith('.txt')) {
        promptContent += `<br><strong>File: ${file.name}</strong><pre class="bg-gray-200 p-2 rounded">${file.data}</pre>`;
      } else {
        promptContent += `<br><strong>File: ${file.name}</strong>`;
      }
    });
  }

  chatBubble.innerHTML = `
    <i class="fas ${isError ? 'fa-user' : 'fa-comment'} text-lg ${isError ? 'text-white' : 'text-gray-600'} ${isError ? '' : 'processing'}"></i>
    <div class="chat-response-content flex-1">${isError || isProcessing ? (isProcessing ? '<div class="dot-bouncing"><span></span><span></span><span></span></div>' : promptContent) : content}</div>
    ${isError ? `
      <button class="edit-btn absolute top-1 right-2 icon-btn" title="Edit Prompt" aria-label="Edit prompt ini">
        <i class="fas fa-edit" aria-hidden="true"></i>
      </button>
    ` : ''}
    ${!isError && !isProcessing ? `
      <div class="absolute top-1 right-2 flex gap-2">
        <button class="copy-btn icon-btn" title="Salin Respons" aria-label="Salin respons AI">
          <i class="fas fa-copy" aria-hidden="true"></i>
        </button>
        <button class="regenerate-btn icon-btn" title="Regenerasi Respons" aria-label="Regenerasi respons AI">
          <i class="fas fa-redo" aria-hidden="true"></i>
        </button>
        <button class="share-btn icon-btn" title="Bagikan Chat" aria-label="Bagikan chat ini">
          <i class="fas fa-share" aria-hidden="true"></i>
        </button>
      </div>
    ` : ''}
  `;
  responseOutput.appendChild(chatBubble);

  if (!isError && !isProcessing) {
    chatBubble.querySelector('.copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(response).then(() => {
        alert('Respons berhasil disalin ke clipboard!');
      }).catch(err => {
        console.error('Gagal menyalin:', err);
      });
    });
    chatBubble.querySelector('.regenerate-btn').addEventListener('click', () => {
      document.getElementById('promptInput').value = prompt;
      uploadedFiles = files.map(file => ({ ...file }));
      updateFileList();
      sendPrompt();
    });
    chatBubble.querySelector('.share-btn').addEventListener('click', () => {
      const shareData = {
        title: 'NEXORA AI Chat',
        text: `Prompt: ${prompt}\nResponse: ${response}`,
        url: window.location.href
      };
      if (navigator.share) {
        navigator.share(shareData).catch(err => console.error('Gagal membagikan:', err));
      } else {
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(shareUrl, '_blank');
      }
    });
  }

  if (isError) {
    chatBubble.querySelector('.edit-btn').addEventListener('click', () => {
      document.getElementById('promptInput').value = prompt;
      uploadedFiles = files.map(file => ({ ...file }));
      updateFileList();
      chatBubble.remove();
    });
  }

  responseOutput.scrollTop = responseOutput.scrollHeight;
};

// Tangani upload gambar
const handleImageUpload = () => {
  const imageUpload = document.getElementById('imageUpload');
  if (!imageUpload) {
    console.error('Elemen imageUpload tidak ditemukan');
    alert('Error: imageUpload tidak ditemukan.');
    return;
  }
  imageUpload.addEventListener('change', (event) => {
    console.log('Gambar diunggah:', event.target.files[0]?.name);
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        uploadedFiles.push({ type: 'image', file, name: file.name, data: reader.result });
        updateFileList();
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
    toggleUploadDropdown(); // Close dropdown after selection
  });
};

// Tangani upload file
const handleFileUpload = () => {
  const fileUpload = document.getElementById('fileUpload');
  if (!fileUpload) {
    console.error('Elemen fileUpload tidak ditemukan');
    alert('Error: fileUpload tidak ditemukan.');
    return;
  }
  fileUpload.addEventListener('change', (event) => {
    console.log('File diunggah:', event.target.files[0]?.name);
    const file = event.target.files[0];
    if (file) {
      if (file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = () => {
          uploadedFiles.push({ type: 'file', file, name: file.name, data: reader.result });
          updateFileList();
        };
        reader.readAsText(file);
      } else {
        uploadedFiles.push({ type: 'file', file, name: file.name, data: null });
        updateFileList();
      }
    }
    event.target.value = '';
    toggleUploadDropdown(); // Close dropdown after selection
  });
};

// Perbarui daftar file
const updateFileList = () => {
  console.log('Memperbarui daftar file:', uploadedFiles);
  const fileList = document.getElementById('fileList');
  if (!fileList) {
    console.error('Elemen fileList tidak ditemukan');
    alert('Error: fileList tidak ditemukan.');
    return;
  }
  fileList.innerHTML = '';
  uploadedFiles.forEach((item, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'flex items-center gap-2 bg-gray-200 p-1.5 rounded text-sm text-gray-900';
    fileItem.setAttribute('role', 'listitem');
    fileItem.innerHTML = `
      <span>${item.name}</span>
      <button class="text-red-500 hover:text-red-600 transition" onclick="removeFile(${index})" title="Hapus File" aria-label="Hapus file ${item.name}">
        <i class="fas fa-trash" aria-hidden="true"></i>
      </button>
    `;
    fileList.appendChild(fileItem);
  });
};

// Hapus file dari daftar
const removeFile = (index) => {
  console.log(`Menghapus file indeks ${index}`);
  uploadedFiles.splice(index, 1);
  updateFileList();
};

// Baca file sebagai base64 (untuk gambar)
const readFileAsBase64 = (file) => {
  console.log('Membaca file sebagai base64:', file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Toggle sidebar
const toggleSidebar = (event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  console.log('Toggle sidebar dipanggil');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const toggleBtn = document.getElementById('sidebarToggle');
  const openBtn = document.getElementById('openSidebarBtn');
  const toggleIcon = toggleBtn?.querySelector('i');
  
  if (!sidebar || !mainContent || !toggleBtn || !openBtn || !toggleIcon) {
    console.error('Elemen tidak ditemukan:', {
      sidebar: !!sidebar,
      mainContent: !!mainContent,
      toggleBtn: !!toggleBtn,
      openBtn: !!openBtn,
      toggleIcon: !!toggleIcon
    });
    alert('Error: Elemen toggle tidak ditemukan. Periksa Console.');
    return;
  }

  const isClosed = sidebar.dataset.toggle === 'closed';
  sidebar.dataset.toggle = isClosed ? 'open' : 'closed';
  sidebar.classList.toggle('-translate-x-full', !isClosed);
  sidebar.classList.toggle('translate-x-0', isClosed);
  mainContent.classList.toggle('ml-0', !isClosed);
  mainContent.classList.toggle('md:ml-64', isClosed);
  openBtn.classList.toggle('hidden', isClosed);
  
  toggleIcon.classList.remove('fa-bars', 'fa-times');
  toggleIcon.classList.add(isClosed ? 'fa-times' : 'fa-bars');
  
  console.log(isClosed ? 'Sidebar dibuka' : 'Sidebar ditutup');
};

// Toggle tema gelap/terang
const toggleTheme = () => {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const icon = themeToggle.querySelector('i');
  const currentTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
  body.dataset.theme = currentTheme;
  localStorage.setItem('nexoraTheme', currentTheme);
  icon.classList.remove('fa-moon', 'fa-sun');
  icon.classList.add(currentTheme === 'dark' ? 'fa-sun' : 'fa-moon');
};

// Unduh riwayat sebagai PDF
const downloadHistory = () => {
  const history = JSON.parse(localStorage.getItem('nexoraHistory')) || [];
  if (!history.length) {
    alert('Tidak ada riwayat untuk diunduh.');
    return;
  }
  const element = document.createElement('div');
  element.innerHTML = `
    <h1 style="font-family: 'DM Sans', sans-serif; font-size: 24px;">Riwayat NEXORA AI</h1>
    ${history.map(item => `
      <div style="margin-bottom: 20px;">
        <p><strong>Prompt:</strong> ${item.prompt}</p>
        <p><strong>Response:</strong> ${item.response}</p>
        ${item.files && item.files.length ? `<p><strong>Files:</strong> ${item.files.map(f => f.name).join(', ')}</p>` : ''}
        <p><strong>Tanggal:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
      </div>
    `).join('')}
  `;
  const opt = {
    margin: 1,
    filename: 'NEXORA_AI_History.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().from(element).set(opt).save();
};

// Toggle dropdown menu untuk upload
const toggleUploadDropdown = () => {
  const dropdown = document.getElementById('uploadDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
};

// Fungsi untuk mengirim prompt
const sendPrompt = async () => {
  console.log('Fungsi sendPrompt dipanggil');
  const promptInput = document.getElementById('promptInput');
  const responseOutput = document.getElementById('responseOutput');
  const submitBtn = document.getElementById('submitBtn');
  const inputArea = document.getElementById('inputArea');
  const chatArea = document.getElementById('chatArea');

  if (!promptInput || !responseOutput || !submitBtn || !inputArea || !chatArea) {
    console.error('Elemen DOM tidak ditemukan:', {
      promptInput: !!promptInput,
      responseOutput: !!responseOutput,
      submitBtn: !!submitBtn,
      inputArea: !!inputArea,
      chatArea: !!chatArea
    });
    alert('Error: Elemen halaman tidak ditemukan. Periksa Console.');
    addChat('System', 'Error: Elemen halaman tidak ditemukan.', [], true);
    return;
  }

  const promptText = promptInput.value.trim();
  if (!promptText && uploadedFiles.length === 0) {
    console.log('Prompt kosong dan tidak ada file');
    addChat('System', 'Harap masukkan pertanyaan atau unggah file untuk NEXORA AI.', [], true);
    return;
  }

  console.log('Mengirim prompt:', promptText, 'File:', uploadedFiles);

  inputArea.classList.add('bottom');
  inputArea.classList.remove('absolute', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'w-11/12', 'max-w-lg', 'sm:max-w-xl');
  inputArea.classList.add('w-full', 'max-w-none', 'relative');
  chatArea.classList.add('active');
  chatArea.classList.remove('hidden');

  submitBtn.classList.add('disabled');
  submitBtn.disabled = true;

  const filesForDisplay = uploadedFiles.map(item => ({
    type: item.type,
    name: item.name,
    data: item.data
  }));

  // Tambahkan prompt pengguna secara permanen
  addChat(promptText, promptText, filesForDisplay, true);

  // Tambahkan pesan "sedang memproses" dengan ID unik
  addChat('NEXORA AI sedang memproses...', 'NEXORA AI sedang memproses...', [], false, true);

  try {
    const parts = [];
    if (promptText) {
      parts.push({ text: promptText });
    }

    for (const item of uploadedFiles) {
      if (item.type === 'image') {
        const base64 = await readFileAsBase64(item.file);
        parts.push({
          inline_data: {
            mime_type: item.file.type,
            data: base64
          }
        });
      } else if (item.name.endsWith('.txt')) {
        parts.push({ text: `Konten file ${item.name}:\n${item.data}` });
      } else {
        parts.push({ text: `File terlampir: ${item.name}` });
      }
    }

    console.log('Mengirim permintaan ke API:', parts);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error dari Gemini:', errorData);
      throw new Error(errorData.error?.message || 'Gagal mengambil respons dari NEXORA AI.');
    }

    const data = await response.json();
    console.log('Respons dari Gemini:', data);
    const aiResponse = data.candidates[0].content.parts[0].text;

    // Hapus pesan "sedang memproses" berdasarkan ID
    const processingBubble = document.getElementById('processingBubble');
    if (processingBubble) {
      processingBubble.remove();
    }

    // Tambahkan respons AI
    addChat(promptText, aiResponse, filesForDisplay);
    saveHistory(promptText, aiResponse, filesForDisplay);
    uploadedFiles = [];
    updateFileList();
  } catch (error) {
    console.error('Kesalahan saat mengirim prompt:', error.message);
    const processingBubble = document.getElementById('processingBubble');
    if (processingBubble) {
      processingBubble.remove();
    }
    addChat(promptText, `Error: ${error.message}`, filesForDisplay, true);
  } finally {
    console.log('Mengaktifkan tombol');
    submitBtn.classList.remove('disabled');
    submitBtn.disabled = false;
  }

  promptInput.value = '';
};

// Inisialisasi event listener untuk toggle
const initToggleListener = () => {
  console.log('Menginisialisasi toggle listener');
  const toggleBtn = document.getElementById('sidebarToggle');
  const openBtn = document.getElementById('openSidebarBtn');
  if (!toggleBtn || !openBtn) {
    console.error('Elemen toggle tidak ditemukan:', {
      toggleBtn: !!toggleBtn,
      openBtn: !!openBtn
    });
    alert('Error: Tombol toggle tidak ditemukan. Periksa HTML.');
    return;
  }

  const events = ['click', 'touchstart'];
  events.forEach(event => {
    toggleBtn.addEventListener(event, toggleSidebar, { passive: false });
    openBtn.addEventListener(event, toggleSidebar, { passive: false });
    console.log(`Event listener ${event} untuk sidebarToggle dan openSidebarBtn ditambahkan`);
  });
};

// Inisialisasi event listener lainnya
const initEventListeners = () => {
  console.log('Menginisialisasi event listener');
  
  initToggleListener();

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      console.log('Tombol Kirim diklik');
      sendPrompt();
    });
  } else {
    console.error('Elemen submitBtn tidak ditemukan');
    alert('Error: submitBtn tidak ditemukan.');
  }

  const promptInput = document.getElementById('promptInput');
  if (promptInput) {
    promptInput.addEventListener('keydown', (event) => {
      console.log('Key pressed:', event.key);
      if (event.key === 'Enter' && !event.shiftKey) {
        console.log('Enter pressed without Shift');
        event.preventDefault();
        sendPrompt();
      }
    });
  } else {
    console.error('Elemen promptInput tidak ditemukan');
    alert('Error: promptInput tidak ditemukan.');
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  const historyFilter = document.getElementById('historyFilter');
  if (historyFilter) {
    historyFilter.addEventListener('input', loadHistory);
  }

  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', loadHistory);
  }

  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', toggleUploadDropdown);
  }

  // Tutup dropdown jika klik di luar
  document.addEventListener('click', (event) => {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadDropdown = document.getElementById('uploadDropdown');
    if (uploadBtn && uploadDropdown && !uploadBtn.contains(event.target) && !uploadDropdown.contains(event.target)) {
      uploadDropdown.classList.add('hidden');
    }
  });

  handleImageUpload();
  handleFileUpload();
};

// Debounce untuk event resize
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Muat riwayat dan inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  console.log('Halaman dimuat, menginisialisasi');
  loadHistory();
  initEventListeners();

  const savedTheme = localStorage.getItem('nexoraTheme') || 'light';
  document.body.dataset.theme = savedTheme;
  const themeToggle = document.getElementById('themeToggle');
  const iconacci = themeToggle.querySelector('i');
  icon.classList.remove('fa-moon', 'fa-sun');
  icon.classList.add(savedTheme === 'dark' ? 'fa-sun' : 'fa-moon');

  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const toggleBtn = document.getElementById('sidebarToggle');
  const openBtn = document.getElementById('openSidebarBtn');
  const toggleIcon = toggleBtn?.querySelector('i');

  if (!sidebar || !mainContent || !toggleBtn || !openBtn || !toggleIcon) {
    console.error('Elemen inisialisasi tidak ditemukan:', {
      sidebar: !!sidebar,
      mainContent: !!mainContent,
      toggleBtn: !!toggleBtn,
      openBtn: !!openBtn,
      toggleIcon: !!toggleIcon
    });
    alert('Error: Elemen inisialisasi tidak ditemukan. Periksa Console.');
    return;
  }

  const updateSidebarState = () => {
    console.log('Memperbarui status sidebar, lebar layar:', window.innerWidth);
    if (window.innerWidth <= 768) {
      if (sidebar.dataset.toggle !== 'open') {
        sidebar.dataset.toggle = 'closed';
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        mainContent.classList.add('ml-0');
        mainContent.classList.remove('md:ml-64');
        openBtn.classList.remove('hidden');
        toggleIcon.classList.remove('fa-times');
        toggleIcon.classList.add('fa-bars');
        console.log('Mode mobile: sidebar ditutup');
      }
    } else {
      if (sidebar.dataset.toggle !== 'closed') {
        sidebar.dataset.toggle = 'open';
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        mainContent.classList.remove('ml-0');
        mainContent.classList.add('md:ml-64');
        openBtn.classList.add('hidden');
        toggleIcon.classList.remove('fa-bars');
        toggleIcon.classList.add('fa-times');
        console.log('Mode desktop: sidebar dibuka');
      }
    }
  };

  updateSidebarState();

  window.addEventListener('resize', debounce(() => {
    console.log('Ukuran layar berubah:', window.innerWidth);
    updateSidebarState();
  }, 100));

  // Fallback: Re-attach toggle listener setelah 1 detik
  setTimeout(initToggleListener, 1000);
});