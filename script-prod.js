const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwLmvgUl3qxWcp5-e46vHGsIn1NDJGzdFDB16DDWlnAQIAvzksc6GnxjjVp4qVksYCMg/exec';

const CACHE_CONFIG = {
    DURATIONS: {
        STATIC: 24 * 60 * 60 * 1000,     // 24 jam untuk data statis
        DYNAMIC: 30 * 60 * 1000,         // 30 menit untuk data dinamis
        SHORT: 10 * 60 * 1000,           // 10 menit untuk data sering berubah
    },
    
    // ⚡ OPTIMASI PERFORMANCE
    BATCH_DELAY: 10,                     // Turunkan dari 100ms ke 10ms
    MAX_CONCURRENT: 6,
    PRELOAD_DELAY: 50,                   // Naikkan dari 2 ke 6
    
    KEYS: {
        PROGRAMS: 'programs_data',
        PROMOS: 'promos_data',
        TESTIMONIALS: 'testimonials_data',
        KARIR: 'karir_data',
        PROFIL: 'profil_lembaga',
        STATS: 'stats_data',
        KEUNGGULAN: 'keunggulan_data',
        TENTANG: 'tentang_kami_data'
    }
};

const appCache = {
    data: new Map(),
    pendingRequests: new Map(),
    activeRequests: 0,
    
    stats: {
        hits: 0,
        misses: 0,
        saves: 0,
        batchCount: 0
    }
};

let currentPrograms = [];
let currentPromos = [];
let currentProgramPromos = null;

const ProgressManager = {
    indicators: new Map(),
    
    show(containerId, message = 'Memuat data...') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const indicatorId = `progress-${containerId}-${Date.now()}`;
        this.indicators.set(containerId, indicatorId);
        
        container.innerHTML = `
            <div id="${indicatorId}" class="progress-indicator">
                <div class="progress-spinner"></div>
                <div class="progress-text">${message}</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        `;
    },
    
    update(containerId, progress) {
        const indicatorId = this.indicators.get(containerId);
        if (!indicatorId) return;
        
        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            const fill = indicator.querySelector('.progress-fill');
            const text = indicator.querySelector('.progress-text');
            if (fill) fill.style.width = `${progress}%`;
            if (text) text.textContent = `Memuat data... ${progress}%`;
        }
    },
    
    hide(containerId) {
        this.indicators.delete(containerId);
    }
};

const CacheManager = {
    // Get data from cache dengan validasi expiry
    get(key) {
        const cached = appCache.data.get(key);
        if (!cached) {
            appCache.stats.misses++;
            return null;
        }
        
        const now = Date.now();
        if (now > cached.expiry) {
            appCache.data.delete(key);
            appCache.stats.misses++;
            return null;
        }
        
        appCache.stats.hits++;
        return cached.data;
    },
    
    // Set data to cache dengan expiry
    set(key, data, duration = CACHE_CONFIG.DURATIONS.DYNAMIC) {
        const expiry = Date.now() + duration;
        appCache.data.set(key, { data, expiry });
        appCache.stats.saves++;
    },
    
    // Generic cache loader
    async loadWithCache(cacheKey, functionName, params = {}, duration = CACHE_CONFIG.DURATIONS.DYNAMIC) {
        // Check cache first
        const cached = this.get(cacheKey);
        if (cached) {
            return cached;
        }
        
        // If request already pending, wait for it
        if (appCache.pendingRequests.has(cacheKey)) {
            return await appCache.pendingRequests.get(cacheKey);
        }
        
        // Make new request dengan concurrency control
        while (appCache.activeRequests >= CACHE_CONFIG.MAX_CONCURRENT) {

            await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.BATCH_DELAY));
        }
        
        appCache.activeRequests++;
        const requestPromise = this.makeRequest(functionName, params, cacheKey, duration);
        appCache.pendingRequests.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            appCache.activeRequests--;
            appCache.pendingRequests.delete(cacheKey);
        }
    },
    
    // Make actual request
    async makeRequest(functionName, params, cacheKey, duration) {
        try {
            const response = await callGoogleScript(functionName, params);
            
            if (response.success) {
                const data = response.data || response;
                this.set(cacheKey, data, duration);
                return data;
            } else {
                throw new Error(response.message || `Request failed for ${functionName}`);
            }
        } catch (error) {
            throw error;
        }
    },
    
    // Get cache statistics
    getStats() {
        const total = appCache.stats.hits + appCache.stats.misses;
        const hitRate = total > 0 ? Math.round((appCache.stats.hits / total) * 100) : 0;
        
        return {
            ...appCache.stats,
            hitRate: hitRate,
            size: appCache.data.size
        };
    },

// GANTI ini di preloadCriticalData():
async preloadCriticalData() {
    
    // ⚡ Preload SEMUA data critical tanpa blocking
    const criticalLoads = [
        this.loadWithCache(CACHE_CONFIG.KEYS.PROGRAMS, 'getProgramAktif', {}, CACHE_CONFIG.DURATIONS.STATIC),
        this.loadWithCache(CACHE_CONFIG.KEYS.PROMOS, 'getPromoAktif', {}, CACHE_CONFIG.DURATIONS.DYNAMIC),
        this.loadWithCache(CACHE_CONFIG.KEYS.STATS, 'getStatistik', {}, CACHE_CONFIG.DURATIONS.SHORT),
        this.loadWithCache(CACHE_CONFIG.KEYS.KEUNGGULAN, 'getKeunggulan', {}, CACHE_CONFIG.DURATIONS.STATIC)
    ];
    
    // Jangan tunggu semua, langsung lanjut inisialisasi
    Promise.all(criticalLoads).then(() => {
    }).catch(err => {
    })
}};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});
// Tambahkan function ini
function setupLogoNavigation() {
    const logoLinks = document.querySelectorAll('.logo-link');
    
    logoLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'index.html';
        });
    });
    
    const logoImages = document.querySelectorAll('.logo-img');
    logoImages.forEach(img => {
        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'index.html';
        });
    });
}

async function initializeApp() {
    
    // Preload critical data untuk cache
    await CacheManager.preloadCriticalData();
    
    setupNavigation();
    setupLogoNavigation();
    loadPageData();
    loadProfilLembaga();
    
    // ✅ TAMBAHKAN INI: Initialize lazy loading
    initializeLazyLoading();
    // Panggil fungsi optimasi tambahan
warmEssentialCaches();
preloadCriticalImages();
    
    // Log cache stats setelah inisialisasi
    setTimeout(() => {
        const stats = CacheManager.getStats();
    }, 2000);
    
}
// Tambahkan di akhir initializeApp()
async function warmEssentialCaches() {
    const essentialEndpoints = [
        'getProgramAktif',
        'getPromoAktif', 
        'getStatistik'
    ];
    
    // Fire and forget - jangan block rendering
    essentialEndpoints.forEach(endpoint => {
        fetch(`${SCRIPT_URL}?function=${endpoint}&callback=noop`)
            .catch(() => {}); // Ignore errors
    });
}

// Preload gambar penting
function preloadCriticalImages() {
    const criticalImages = [
        'LOGO_WA.png',
        'LOGO_IG.png', 
        'LOGO_EMAIL.png',
        'LOGO_GMAPS.png'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}


function initializeLazyLoading() {
    // Load testimonials hanya ketika user scroll ke section
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadTestimonialsPreview();
                observer.unobserve(entry.target);
            }
        });
    });
    
    const testimonialsSection = document.getElementById('testimonialsContainer');
    if (testimonialsSection) observer.observe(testimonialsSection);
}

function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page;
}

function loadPageData() {
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index.html':
        case '/':
            loadHomepageData();
            break;
        case 'program.html':
            loadProgramsData();
            break;
        case 'program-detail.html':
            loadProgramDetail();
            break;
        case 'promo.html':
            loadPromosData();
            break;
        case 'promo-detail.html': 
            loadPromoDetail();
            break;
        case 'testimoni.html':
            loadTestimonialsData();
            break;
        case 'karir.html':
            loadKarirData();
            break;
        case 'karir-detail.html':
            loadKarirDetail();
            break;
        case 'registrasi.html':
            initializeRegistrationForm();
            break;
        case 'registrasi-tutor.html':
            initializeTutorForm();
            break;
        default:
    }
}

async function callGoogleScript(functionName, data = {}) {
    return await callWithJSONP(functionName, data);
}

function callWithJSONP(functionName, data) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        window[callbackName] = function(response) {
            
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            if (response && typeof response === 'object') {
                if (response.success !== undefined) {
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.message || 'Request failed'));
                    }
                } else {
                    resolve(response);
                }
            } else {
                reject(new Error('Invalid response format'));
            }
        };
        
        const script = document.createElement('script');
        const params = new URLSearchParams();
        
        params.append('function', functionName);
        if (Object.keys(data).length > 0) {
            params.append('data', JSON.stringify(data));
        }
        params.append('callback', callbackName);
        
        const url = SCRIPT_URL + '?' + params.toString();
        
        script.src = url;
        
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error(`Network error - Gagal memuat data untuk ${functionName}`));
        };
        
        document.head.appendChild(script);
        
// TURUNKAN timeout dari 45 detik
const timeout = setTimeout(() => {
    if (window[callbackName]) {
        delete window[callbackName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
        reject(new Error(`Request timeout untuk ${functionName}`));
    }
}, 25000); // Turun dari 45s ke 25s
        
        script.onload = function() {
            clearTimeout(timeout);
        };
    });
}

function setupNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
        });
    });
}

async function loadProfilLembaga() {
    try {
        const profil = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.PROFIL, 
            'getProfilLembaga', 
            {}, 
            CACHE_CONFIG.DURATIONS.STATIC
        );
        
        if (profil) {
            updateFooterInfo(profil);
            updateContactInfo(profil);
        }
    } catch (error) {
    }
}

function updateFooterInfo(profil) {
    const footerSections = document.querySelectorAll('.footer-section');
    
    footerSections.forEach(section => {
        const heading = section.querySelector('h3');
        if (heading && heading.textContent.includes('Smart Catalyst')) {
            const desc = section.querySelector('p');
            if (desc && profil.deskripsi) {
                desc.textContent = profil.deskripsi;
            }
        }
        
        if (heading && heading.textContent.includes('Kontak Kami')) {
            updateContactSection(section, profil);
        }
    });
}

function updateContactSection(section, profil) {
    const contactHTML = `
        <div class="contact-item">
            <img src="LOGO_WA.png" alt="WhatsApp" class="contact-logo">
            <a href="https://wa.me/${profil.telepon ? profil.telepon.replace(/\D/g, '') : '6285180649460'}" target="_blank" class="contact-link">
                WhatsApp
            </a>
        </div>
        <div class="contact-item">
            <img src="LOGO_IG.png" alt="Instagram" class="contact-logo">
            <a href="${profil.instagram || 'https://instagram.com/smart_catalyst.psw'}" target="_blank" class="contact-link">
                Instagram
            </a>
        </div>
        <div class="contact-item">
            <img src="LOGO_EMAIL.png" alt="Email" class="contact-logo">
            <a href="mailto:${profil.email || 'muhammadfadilkamal@gmail.com'}" class="contact-link">
                Email
            </a>
        </div>
        <div class="contact-item">
            <img src="LOGO_GMAPS.png" alt="Lokasi" class="contact-logo">
            <span class="contact-text">${profil.alamat || 'Pringsewu Selatan, Pringsewu, Lampung'}</span>
        </div>
    `;
    
    section.innerHTML = '<h3>Kontak Kami</h3>' + contactHTML;
}

function updateContactInfo(profil) {
    const contactElements = document.querySelectorAll('[data-contact]');
    contactElements.forEach(element => {
        const contactType = element.getAttribute('data-contact');
        switch(contactType) {
            case 'whatsapp':
                element.href = `https://wa.me/${profil.telepon ? profil.telepon.replace(/\D/g, '') : '6285180649460'}`;
                break;
            case 'instagram':
                element.href = profil.instagram || 'https://instagram.com/smartcatalyst';
                break;
            case 'email':
                element.href = `mailto:${profil.email || 'info@smartcatalyst.com'}`;
                break;
        }
    });
}
function renderProgramsPreview(programs) {
    const container = document.getElementById('programsContainer');
    if (!container) return;
    
    // Panggil fungsi yang sudah ada
    loadProgramsPreview();
}

function renderStats(stats) {
    const container = document.getElementById('statsContainer');
    if (!container) return;
    
    // Panggil fungsi yang sudah ada  
    loadStats();
}

function renderKeunggulan(keunggulan) {
    const container = document.getElementById('keunggulanContainer');
    if (!container) return;
    
    // Panggil fungsi yang sudah ada
    loadKeunggulan();
}

function renderTentangKami(tentang) {
    const container = document.getElementById('tentangKamiContainer');
    if (!container) return;
    
    // Panggil fungsi yang sudah ada
    loadTentangKami();
}

function renderPromos(promos) {
    // Optional: jika ingin render promos di homepage
}
async function loadHomepageData() {
    // ⚡ Load visible content FIRST
    const programsPromise = CacheManager.loadWithCache(
        CACHE_CONFIG.KEYS.PROGRAMS, 'getProgramAktif'
    );
    
    const statsPromise = CacheManager.loadWithCache(
        CACHE_CONFIG.KEYS.STATS, 'getStatistik'
    );
    
    // Render programs ASAP
    programsPromise.then(programs => {
        renderProgramsPreview(programs);
    });
    
    statsPromise.then(stats => {
        renderStats(stats);
    });
    
    // Secondary data - load in background
    setTimeout(() => {
        Promise.all([
            CacheManager.loadWithCache(CACHE_CONFIG.KEYS.KEUNGGULAN, 'getKeunggulan'),
            CacheManager.loadWithCache(CACHE_CONFIG.KEYS.TENTANG, 'getTentangKami')
        ]).then(([keunggulan, tentang]) => {
            renderKeunggulan(keunggulan);
            renderTentangKami(tentang);
        });
    }, 1000);
}

async function loadStats() {
    const container = document.getElementById('statsContainer');
    if (!container) return;
    
    try {
        ProgressManager.update('statsContainer', 30);
        
        const stats = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.STATS,
            'getStatistik',
            {},
            CACHE_CONFIG.DURATIONS.SHORT
        );
        
        ProgressManager.update('statsContainer', 80);
        
        if (stats) {
            container.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${stats.jumlah_siswa}+</div>
                    <div class="stat-label">Siswa Aktif</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.jumlah_tutor}+</div>
                    <div class="stat-label">Tutor Profesional</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.jumlah_program}</div>
                    <div class="stat-label">Program Belajar</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.jumlah_promo}</div>
                    <div class="stat-label">Promo Aktif</div>
                </div>
            `;
        } else {
            throw new Error('Data statistik tidak tersedia');
        }
        
        ProgressManager.update('statsContainer', 100);
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                <p style="color: #666;">⚠️ Gagal memuat statistik: ${error.message}</p>
                <button onclick="loadStats()" class="btn btn-primary" style="margin-top: 1rem;">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
        ProgressManager.hide('statsContainer');
    }
}

async function loadKeunggulan() {
    const container = document.getElementById('keunggulanContainer');
    if (!container) return;
    
    try {
        ProgressManager.update('keunggulanContainer', 30);
        
        const keunggulan = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.KEUNGGULAN,
            'getKeunggulan',
            {},
            CACHE_CONFIG.DURATIONS.STATIC
        );
        
        ProgressManager.update('keunggulanContainer', 80);
        
        if (!keunggulan || keunggulan.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <h3 style="color: #666; margin-bottom: 1rem;">⭐ Keunggulan Kami</h3>
                    <p style="color: #999;">Kami berkomitmen memberikan yang terbaik untuk pendidikan anak Anda.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = keunggulan.map(item => `
            <div class="feature-card">
                <div class="feature-icon">${item.icon || '⭐'}</div>
                <h3 class="feature-title">${item.judul || 'Keunggulan'}</h3>
                <p class="feature-description">${item.deskripsi || ''}</p>
            </div>
        `).join('');
        
        ProgressManager.update('keunggulanContainer', 100);
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #666; margin-bottom: 1rem;">⭐ Keunggulan Kami</h3>
                <p style="color: #999;">Kami berkomitmen memberikan yang terbaik untuk pendidikan anak Anda.</p>
            </div>
        `;
        ProgressManager.hide('keunggulanContainer');
    }
}

async function loadTentangKami() {
    const container = document.getElementById('tentangKamiContainer');
    if (!container) return;
    
    try {
        ProgressManager.update('tentangKamiContainer', 30);
        
        const tentang = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.TENTANG,
            'getTentangKami',
            {},
            CACHE_CONFIG.DURATIONS.STATIC
        );
        
        ProgressManager.update('tentangKamiContainer', 80);
        
        container.innerHTML = `
            <div class="about-content">
                <div class="about-text">
                    <h2>Tentang Smart Catalyst</h2>
                    <p>${tentang.deskripsi_lengkap || 'Lembaga bimbingan belajar profesional dengan pengajar berkualitas dan metode pembelajaran yang menyenangkan.'}</p>
                    
                    ${tentang.visi ? `
                        <div class="vision-mission">
                            <h3>🦅 Visi</h3>
                            <p>${tentang.visi}</p>
                        </div>
                    ` : ''}
                    
                    ${tentang.misi ? `
                        <div class="vision-mission">
                            <h3>🎯 Misi</h3>
                            <ul>
                                ${tentang.misi.split('\n').map(item => item.trim()).filter(item => item).map(item => `
                                    <li>${item}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        ProgressManager.update('tentangKamiContainer', 100);
    } catch (error) {
        container.innerHTML = `
            <div class="about-content">
                <div class="about-text">
                    <h2>Tentang Smart Catalyst</h2>
                    <p>Lembaga bimbingan belajar profesional dengan pengajar berkualitas dan metode pembelajaran yang menyenangkan. Fokus pada pengembangan potensi akademik dan karakter siswa.</p>
                </div>
            </div>
        `;
        ProgressManager.hide('tentangKamiContainer');
    }
}

async function loadProgramsPreview() {
    const container = document.getElementById('programsContainer');
    if (!container) return;
    
    ProgressManager.show('programsContainer', 'Memuat program unggulan...');
    
    try {
        ProgressManager.update('programsContainer', 30);
        
        const [programs, promos] = await Promise.all([
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROGRAMS,
                'getProgramAktif',
                {},
                CACHE_CONFIG.DURATIONS.DYNAMIC
            ),
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROMOS,
                'getPromoAktif',
                {},
                CACHE_CONFIG.DURATIONS.SHORT
            )
        ]);
        
        ProgressManager.update('programsContainer', 70);
        
        const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
        const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
        
        // ⭐ FILTER PROGRAM UNGGULAN - dengan fallback
        let programUnggulan = [];
        
        // Coba filter dengan kolom unggul jika ada
        if (programsArray.length > 0 && programsArray[0].unggul !== undefined) {
            programUnggulan = programsArray.filter(program => 
                program.unggul && program.unggul.toString().toLowerCase() === 'aktif'
            );
        } 
        
        // Jika tidak ada yang unggul, ambil semua program
        if (programUnggulan.length === 0) {
            programUnggulan = programsArray.slice(0, 6);
        }
        
        currentPrograms = programUnggulan;
        
        if (programUnggulan.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <h3 style="color: #666; margin-bottom: 1rem;">⭐ Program Unggulan</h3>
                    <p style="color: #999;">Belum ada program unggulan saat ini.</p>
                    <a href="program.html" class="btn btn-primary" style="margin-top: 1rem;">
                        Lihat Semua Program
                    </a>
                </div>
            `;
            ProgressManager.hide('programsContainer');
            return;
        }
        
        // Kelompokkan program unggulan berdasarkan kategori
        const programsByCategory = groupProgramsByCategory(programUnggulan);
        
        // Jika hanya ada kategori "Lainnya", coba grouping manual
        if (Object.keys(programsByCategory).length === 1 && Object.keys(programsByCategory)[0] === 'Lainnya') {
            const manualGrouped = manualGroupPrograms(programUnggulan);
            container.innerHTML = renderPreviewProgramsByCategory(manualGrouped, promosArray);
        } else {
            container.innerHTML = renderPreviewProgramsByCategory(programsByCategory, promosArray);
        }
        
        ProgressManager.update('programsContainer', 100);
        setTimeout(() => ProgressManager.hide('programsContainer'), 500);
        
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">❌ Gagal Memuat Program Unggulan</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadProgramsPreview()" class="btn btn-primary">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
        ProgressManager.hide('programsContainer');
    }
}
// Fungsi untuk render preview program berdasarkan kategori (homepage)
function renderPreviewProgramsByCategory(programsByCategory, promosArray) {
    let html = '';
    
    // Untuk homepage, kita batasi hanya 2 program per kategori
    for (const [kategori, programs] of Object.entries(programsByCategory)) {
        const limitedPrograms = programs.slice(0, 2); // Maksimal 2 program per kategori di homepage
        
        // Judul kategori untuk homepage
        html += `
            <div class="category-section" style="grid-column: 1 / -1; margin: 2rem 0 1rem 0;">
                <h2 class="category-title" style="color: var(--dark-gray); font-size: 1.8rem; text-align: center; margin-bottom: 1.5rem;">
                    ${kategori}
                </h2>
            </div>
        `;
        
        // Program dalam kategori ini (maksimal 2)
        limitedPrograms.forEach(program => {
            const programPromo = promosArray.find(promo => promo.id_program === program.id_program);
            const finalPrice = programPromo ? 
                program.harga * (1 - programPromo.diskon_percent / 100) : 
                program.harga;
            
            const programImage = extractImageFromProgram(program);
            
            html += `
                <div class="program-card">
                    <div class="program-image-container">
                        <img src="${programImage}" 
                             alt="${program.nama_program}" 
                             class="program-image"
                             loading="lazy"
                             onerror="this.onerror=null; this.src='${getDefaultProgramImage(program.jenjang)}'">
                        ${programPromo ? `
                            <div class="image-badge">🎉 Promo ${programPromo.diskon_percent}%</div>
                        ` : ''}
                        <!-- Badge Unggulan -->
                        <div class="image-badge" style="background: var(--primary-purple);">
                            ⭐ Unggulan
                        </div>
                    </div>
                    <div class="program-content">
                        <h3 class="program-title">${program.nama_program}</h3>
                        <div class="program-jenjang">${program.jenjang}</div>
                        
                        <p class="program-description">${program.deskripsi}</p>
                        
                        ${programPromo ? `
                            <div class="program-promo">
                                🎉 Hemat ${programPromo.diskon_percent}% - 
                                Hanya Rp ${finalPrice.toLocaleString('id-ID')}
                            </div>
                            <div class="program-price" style="text-decoration: line-through; color: #ef4444; font-size: 1rem;">
                                Rp ${program.harga.toLocaleString('id-ID')}
                            </div>
                        ` : `
                            <div class="program-price">
                                ${program.harga_tampilan && /\d/.test(program.harga_tampilan) 
                                    ? program.harga_tampilan 
                                    : (program.harga_tampilan ? `${program.harga_tampilan} Rp ${program.harga.toLocaleString('id-ID')}` : `Rp ${program.harga.toLocaleString('id-ID')}`)
                                }
                            </div>
                        `}
                        
                        <div class="program-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="btn btn-success" onclick="viewProgramDetail('${program.id_program}')" style="flex: 2;">
                                Lihat Detail
                            </button>
                            <button class="btn btn-outline" onclick="downloadBrosurProgram('${program.id_program}', '${program.nama_program}')" 
                                style="flex: 1; background: transparent; border: 2px solid #3b82f6; color: #3b82f6;"
                                title="Unduh Brosur">
                                📥 Brosur
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    // Tambahkan link ke halaman program lengkap
    html += `
        <div class="text-center" style="grid-column: 1 / -1; margin-top: 3rem;">
            <a href="program.html" class="btn btn-primary" style="padding: 1rem 2rem; font-size: 1.1rem;">
                📚 Lihat Semua Program
            </a>
        </div>
    `;
    
    return html;
}


async function loadTestimonialsPreview() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;
    
    showLoading(container);
    
    try {
        const response = await callGoogleScript('getTestimoniAktif', {});
        
        if (!response.success) {
            throw new Error(response.message);
        }
        
        // FIX: Pastikan response.data adalah array sebelum menggunakan .slice()
        const testimonialsArray = Array.isArray(response.data) ? response.data : [];
        const testimonials = testimonialsArray.slice(0, 3);
        
        if (testimonials.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <h3 style="color: #666; margin-bottom: 1rem;">💬 Belum Ada Testimoni</h3>
                    <p style="color: #999;">Saat ini belum ada testimoni yang tersedia.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = testimonials.map(testimoni => `
            <div class="testimonial-card">
                <div class="testimonial-content">
                    ${testimoni.isi_testimoni}
                </div>
                <div class="testimonial-author">
                    <div class="author-avatar" style="background: #1e3a5f; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                        ${testimoni.nama.charAt(0)}
                    </div>
                    <div class="author-info">
                        <h4>${testimoni.nama}</h4>
                        <p>${testimoni.asal_sekolah}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">❌ Gagal Memuat Testimoni</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadTestimonialsPreview()" class="btn btn-primary">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
    }
}

async function loadProgramsData() {
    const container = document.getElementById('programsContainer');
    if (!container) return;
    
    ProgressManager.show('programsContainer', 'Memuat program...');
    
    try {
        ProgressManager.update('programsContainer', 30);
        
        const [programs, promos] = await Promise.all([
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROGRAMS,
                'getProgramAktif',
                {},
                CACHE_CONFIG.DURATIONS.DYNAMIC
            ),
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROMOS,
                'getPromoAktif',
                {},
                CACHE_CONFIG.DURATIONS.SHORT
            )
        ]);
        
        ProgressManager.update('programsContainer', 70);
        
        currentPrograms = Array.isArray(programs) ? programs : (programs?.data || []);
        const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
        
        if (currentPrograms.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <h3 style="color: #666; margin-bottom: 1rem;">📚 Belum Ada Program</h3>
                    <p style="color: #999;">Saat ini belum ada program yang tersedia.</p>
                </div>
            `;
            return;
        }
        
        // Kelompokkan program berdasarkan kategori
        const programsByCategory = groupProgramsByCategory(currentPrograms);
        
        // Jika hanya ada kategori "Lainnya", coba grouping manual
        if (Object.keys(programsByCategory).length === 1 && Object.keys(programsByCategory)[0] === 'Lainnya') {
            const manualGrouped = manualGroupPrograms(currentPrograms);
            container.innerHTML = renderProgramsByCategory(manualGrouped, promosArray);
        } else {
            container.innerHTML = renderProgramsByCategory(programsByCategory, promosArray);
        }
        
        ProgressManager.update('programsContainer', 100);
        setTimeout(() => ProgressManager.hide('programsContainer'), 500);
        
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">❌ Gagal Memuat Program</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadProgramsData()" class="btn btn-primary">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
        ProgressManager.hide('programsContainer');
    }
}

// Fungsi fallback untuk grouping manual berdasarkan nama program
function manualGroupPrograms(programs) {
    const categories = {
        'Private': [],
        'Mini Class': [],
        'Lainnya': []
    };
    
    programs.forEach(program => {
        const nama = program.nama_program.toLowerCase();
        
        if (nama.includes('private') || nama.includes('privat')) {
            categories['Private'].push(program);
        } else if (nama.includes('mini class') || nama.includes('semi private') || nama.includes('group')) {
            categories['Mini Class'].push(program);
        } else {
            categories['Lainnya'].push(program);
        }
    });
    
    // Hapus kategori yang kosong
    Object.keys(categories).forEach(kategori => {
        if (categories[kategori].length === 0) {
            delete categories[kategori];
        }
    });
    
    return categories;
}

// Fungsi untuk mengelompokkan program berdasarkan kategori dengan debugging
function groupProgramsByCategory(programs) {
    const categories = {};
    
    programs.forEach((program, index) => {
        
        // Cari kolom kategori dengan berbagai kemungkinan nama
        let kategori = '';
        
        // Coba berbagai kemungkinan nama kolom
        if (program.kategori && program.kategori.trim() !== '') {
            kategori = program.kategori.trim();
        } else if (program.category && program.category.trim() !== '') {
            kategori = program.category.trim();
        } else if (program.jenis && program.jenis.trim() !== '') {
            kategori = program.jenis.trim();
        } else if (program.kelas && program.kelas.trim() !== '') {
            kategori = program.kelas.trim();
        } else {
            // Fallback: tentukan kategori berdasarkan nama program
            kategori = determineCategoryFromName(program.nama_program);
        }

        
        if (!categories[kategori]) {
            categories[kategori] = [];
        }
        
        categories[kategori].push(program);
    });
    return categories;
}

// Fungsi fallback untuk menentukan kategori dari nama program
function determineCategoryFromName(namaProgram) {
    const nama = namaProgram.toLowerCase();
    
    if (nama.includes('mini class') || nama.includes('semi private') || nama.includes('group')) {
        return 'Mini Class';
    } else if (nama.includes('private') || nama.includes('privat')) {
        return 'Private';
    } else if (nama.includes('online') || nama.includes('daring')) {
        return 'Online';
    } else if (nama.includes('intensif') || nama.includes('bimbel')) {
        return 'Intensif';
    } else {
        return 'Reguler';
    }
}
// Fungsi untuk render program berdasarkan kategori
function renderProgramsByCategory(programsByCategory, promosArray) {
    let html = '';
    
    for (const [kategori, programs] of Object.entries(programsByCategory)) {
        // Judul kategori
        html += `
            <div class="category-section" style="grid-column: 1 / -1; margin: 3rem 0 2rem 0;">
                <h2 class="category-title" style="color: var(--dark-gray); font-size: 2rem; text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 3px solid var(--primary-teal);">
                    ${kategori}
                </h2>
            </div>
        `;
        
        // Program dalam kategori ini
        programs.forEach(program => {
            const programPromo = promosArray.find(promo => promo.id_program === program.id_program);
            const finalPrice = programPromo ? 
                program.harga * (1 - programPromo.diskon_percent / 100) : 
                program.harga;
            
            const programImage = extractImageFromProgram(program);
            
            html += `
                <div class="program-card">
                    <div class="program-image-container">
                        <img src="${programImage}" 
                             alt="${program.nama_program}" 
                             class="program-image"
                             loading="lazy"
                             onerror="this.onerror=null; this.src='${getDefaultProgramImage(program.jenjang)}'">
                        ${programPromo ? `
                            <div class="image-badge">🎉 Promo ${programPromo.diskon_percent}%</div>
                        ` : ''}
                    </div>
                    <div class="program-content">
                        <h3 class="program-title">${program.nama_program}</h3>
                        <div class="program-jenjang">${program.jenjang}</div>
                        
                        <p class="program-description">${program.deskripsi || 'Program belajar berkualitas dengan pengajar profesional.'}</p>
                        
                        ${programPromo ? `
                            <div class="program-promo">
                                🎉 Hemat ${programPromo.diskon_percent}% - 
                                Hanya Rp ${finalPrice.toLocaleString('id-ID')}
                            </div>
                            <div class="program-price" style="text-decoration: line-through; color: #ef4444; font-size: 1rem;">
                                Rp ${program.harga.toLocaleString('id-ID')}
                            </div>
                        ` : `
                            <div class="program-price">
                                ${program.harga_tampilan && /\d/.test(program.harga_tampilan) 
                                    ? program.harga_tampilan 
                                    : (program.harga_tampilan ? `${program.harga_tampilan} Rp ${program.harga.toLocaleString('id-ID')}` : `Rp ${program.harga.toLocaleString('id-ID')}`)
                                }
                            </div>
                        `}
                        
                        <div class="program-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="btn btn-success" onclick="viewProgramDetail('${program.id_program}')" style="flex: 2;">
                                Lihat Detail
                            </button>
                            <button class="btn btn-outline" onclick="downloadBrosurProgram('${program.id_program}', '${program.nama_program}')" 
                                style="flex: 1; background: transparent; border: 2px solid #3b82f6; color: #3b82f6;"
                                title="Unduh Brosur">
                                📥 Brosur
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    return html;
}

function viewProgramDetail(programId) {
    window.location.href = `program-detail.html?id=${programId}`;
}

async function loadProgramDetail() {
    const container = document.getElementById('programDetailContainer');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const programId = urlParams.get('id');

    if (!programId) {
        container.innerHTML = `
            <div class="text-center" style="padding: 4rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Program Tidak Ditemukan</h2>
                <p style="color: #666; margin-bottom: 2rem;">Program yang Anda cari tidak tersedia.</p>
                <a href="program.html" class="btn btn-primary">Kembali ke Daftar Program</a>
            </div>
        `;
        return;
    }

    ProgressManager.show('programDetailContainer', 'Memuat detail program...');

    try {
        ProgressManager.update('programDetailContainer', 30);

        const programs = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.PROGRAMS,
            'getProgramAktif',
            {},
            CACHE_CONFIG.DURATIONS.DYNAMIC
        );
        
        ProgressManager.update('programDetailContainer', 70);

        const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
        const program = programsArray.find(p => p.id_program === programId);
        
        if (!program) {
            throw new Error('Program tidak ditemukan');
        }

        const promos = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.PROMOS,
            'getPromoAktif',
            {},
            CACHE_CONFIG.DURATIONS.SHORT
        );

        const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
        const programPromo = promosArray.find(p => p.id_program === programId);

        const finalPrice = programPromo ? 
            program.harga * (1 - programPromo.diskon_percent / 100) : 
            program.harga;

        container.innerHTML = renderProgramDetailContent(program, programPromo, finalPrice);
        
        ProgressManager.update('programDetailContainer', 100);
        setTimeout(() => ProgressManager.hide('programDetailContainer'), 500);

    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="padding: 4rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Gagal Memuat Detail Program</h2>
                <p style="color: #666; margin-bottom: 2rem;">${error.message}</p>
                <a href="program.html" class="btn btn-primary">Kembali ke Daftar Program</a>
            </div>
        `;
        ProgressManager.hide('programDetailContainer');
    }
}

function renderProgramDetailContent(program, programPromo, finalPrice) {
    const deskripsiLengkap =
        program.deskripsi_lengkap || 
        program.deskripsi ||
        'Program belajar berkualitas dengan pengajar profesional dan metode pembelajaran terbaik.';

    const fasilitas =
        program.fasilitas ||
        'Modul belajar lengkap,Konsultasi dengan tutor,Try out berkala,Raport perkembangan,Free wifi dan ruang belajar nyaman';

    const sistemPembelajaran =
        program.sistem_pembelajaran ||
        'Kombinasi teori, praktik, dan latihan soal dengan pendekatan personalized learning.';

    const durasi = program.durasi || 'Disesuaikan dengan kebutuhan siswa';
    const jadwalContoh =
        program.jadwal_contoh || 'Flexible, dapat disesuaikan dengan waktu luang siswa';

    const jenisKelas =
        program.jenis_kelas ||
        (program.nama_program.toLowerCase().includes('private') ? 'Private' : 'Group');

    const getHargaTampilan = () => {
        if (programPromo) {
            return `Rp ${finalPrice.toLocaleString('id-ID')}`;
        }
        
        if (program.harga_tampilan) {
            if (/\d/.test(program.harga_tampilan)) {
                return program.harga_tampilan;
            }
            return `${program.harga_tampilan} Rp ${program.harga.toLocaleString('id-ID')}`;
        }
        
        return `Rp ${program.harga.toLocaleString('id-ID')}`;
    };

    const hargaDisplay = getHargaTampilan();

    return `
        <section class="hero" style="background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-purple) 100%);">
            <div class="hero-content">
                <h1 class="hero-title">${program.nama_program}</h1>
                <p class="hero-subtitle">
                    ${program.jenjang} - ${program.durasi || 'Program Belajar Terbaik'}
                </p>
            </div>
        </section>

        <section class="programs" style="padding-top: 3rem;">
            <div class="program-detail-container" style="max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;">
                <div class="program-detail-grid" style="display: grid; grid-template-columns: 1fr 400px; gap: 3rem;">
                    
                    <div class="program-info">
                        
                        <div class="program-image-container" style="border-radius: var(--border-radius); overflow: hidden; margin-bottom: 2rem; position: relative;">
                            <img 
                                src="${extractImageFromProgram(program)}"
                                alt="${program.nama_program}"
                                class="program-image"
                                style="width: 100%; height: 300px; object-fit: cover;"
                                onerror="this.src='${getDefaultProgramImage(program.jenjang)}'"
                            >
                            ${programPromo ? `
                                <div class="image-badge" 
                                     style="position: absolute; top: 20px; right: 20px; background: var(--primary-teal); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold; font-size: 0.9rem;">
                                    🎉 Promo ${programPromo.diskon_percent}%
                                </div>` : ''}
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem;">📖 Tentang Program</h2>
                            <div style="line-height: 1.8; color: var(--medium-gray); white-space: pre-line;">${deskripsiLengkap}</div>
                            ${!program.deskripsi_lengkap ? `
                                <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                                    <small style="color: #856404;">
                                        ℹ️ Untuk informasi lebih detail tentang program ini, silakan hubungi admin kami.
                                    </small>
                                </div>
                            ` : ''}
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem;">🎯 Fasilitas yang Didapat</h2>
                            <div>${renderFasilitasFromData(fasilitas)}</div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem;">📚 Sistem Pembelajaran</h2>
                        <div style="line-height: 1.8; color: var(--medium-gray);">
                            ${renderSistemPembelajaran(sistemPembelajaran)}
                        </div>
                            </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft);">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem;">ℹ️ Informasi Program</h2>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                                <div>
                                    <strong style="color: var(--primary-blue); font-size: 0.9rem;">📅 Durasi:</strong>
                                    <span style="color: var(--medium-gray);">${durasi}</span>
                                </div>
                                <div>
                                    <strong style="color: var(--primary-blue); font-size: 0.9rem;">🕐 Contoh Jadwal:</strong>
                                    <span style="color: var(--medium-gray);">${jadwalContoh}</span>
                                </div>
                                <div>
                                    <strong style="color: var(--primary-blue); font-size: 0.9rem;">👥 Jenis Kelas:</strong>
                                    <span style="color: var(--medium-gray);">${jenisKelas}</span>
                                </div>
                                <div>
                                    <strong style="color: var(--primary-blue); font-size: 0.9rem;">🎓 Jenjang:</strong>
                                    <span style="color: var(--medium-gray);">${program.jenjang}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="program-sidebar">
                        <div class="pricing-card" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); position: sticky; top: 100px;">
                            ${programPromo ? `
                                <div style="background: linear-gradient(135deg, var(--primary-purple), var(--purple-light)); color: white; padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold;">Hemat ${programPromo.diskon_percent}%</div>
                                    <div>Promo berakhir ${new Date(programPromo.tanggal_selesai).toLocaleDateString('id-ID')}</div>
                                </div>` : ''}

                            <div style="text-align: center; margin-bottom: 2rem;">
                                <div style="font-size: 2rem; font-weight: 700; color: var(--primary-teal);">
                                    ${hargaDisplay}
                                </div>
                                ${programPromo ? `
                                    <div style="text-decoration: line-through; color: var(--medium-gray); font-size: 1.2rem;">
                                        Rp ${program.harga.toLocaleString('id-ID')}
                                    </div>` : ''}
                                <div style="color: var(--medium-gray); font-size: 0.9rem; margin-top: 0.5rem;">
                                    Per ${program.periode || 'bulan'}
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                ${programPromo ? `
                                    <button class="btn btn-success" 
                                        onclick="registerWithPromoConfirmation('${program.id_program}', '${program.nama_program}', ${JSON.stringify(programPromo).replace(/"/g, '&quot;')})" 
                                        style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                                        🔥 Daftar dengan Promo ${programPromo.diskon_percent}%
                                    </button>
                                    <button class="btn btn-outline" 
                                        onclick="openPromoTermsModal(${JSON.stringify(programPromo).replace(/"/g, '&quot;')})" 
                                        style="border-color: #f59e0b; color: #f59e0b;">
                                        📋 Lihat Syarat Promo
                                    </button>` : `
                                    <button class="btn btn-success" 
                                        onclick="registerForProgram('${program.id_program}', '${program.nama_program}')">
                                        🎯 Daftar Sekarang
                                    </button>`}

                                <button class="btn btn-outline"
                                    <button class="btn btn-outline" onclick="downloadBrosurProgram('${program.id_program}', '${program.nama_program}')"
                                    style="padding: 1rem 2rem; font-size: 1.1rem; background: transparent; border: 2px solid var(--primary-blue); color: var(--primary-blue);">
                                    📥 Download Brosur
                                </button>

                                <a href="program.html" class="btn"
                                    style="padding: 1rem 2rem; font-size: 1.1rem; background: var(--light-gray); color: var(--dark-gray); text-align: center; text-decoration: none;">
                                    ← Kembali ke Program
                                </a>
                            </div>

                            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--light-gray);">
                                <h4 style="color: var(--dark-gray); margin-bottom: 1rem;">💡 Butuh Bantuan?</h4>
                                <p style="color: var(--medium-gray); font-size: 0.9rem; margin-bottom: 1rem;">
                                    Konsultasi gratis dengan konsultan pendidikan kami
                                </p>
                                <a href="https://wa.me/6285180649460" target="_blank" class="btn"
                                   style="background: #25D366; color: white; padding: 0.8rem 1.5rem; text-decoration: none; display: block; text-align: center;">
                                    💬 Chat WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderFasilitasFromData(fasilitasData) {
    let facilitiesArray = [];
    
    if (typeof fasilitasData === 'string') {
        if (fasilitasData.includes('\n')) {
            facilitiesArray = fasilitasData.split('\n').map(item => item.trim());
        } else {
            facilitiesArray = fasilitasData.split(',').map(item => item.trim());
        }
    }
    
    if (facilitiesArray.length === 0) {
        facilitiesArray = [
            'Modul belajar lengkap',
            'Konsultasi dengan tutor',
            'Try out berkala', 
            'Raport perkembangan',
            'Free wifi dan ruang belajar nyaman'
        ];
    }
    
    return `
        <ul style="list-style: none; padding: 0;">
            ${facilitiesArray.map(item => `
                <li style="padding: 0.8rem 0; border-bottom: 1px solid var(--light-gray); display: flex; align-items: center; gap: 1rem;">
                    <span style="color: var(--primary-teal); font-weight: bold; font-size: 1.2rem;">✓</span>
                    ${item}
                </li>
            `).join('')}
        </ul>
    `;
}
function renderSistemPembelajaran(sistemData) {
    if (!sistemData) {
        return '<p>- Tidak ada informasi sistem pembelajaran</p>';
    }
    
    let sistemArray = [];
    
    if (typeof sistemData === 'string') {
        if (sistemData.includes('\n')) {
            sistemArray = sistemData.split('\n').map(item => item.trim()).filter(item => item);
        } else {
            sistemArray = sistemData.split(',').map(item => item.trim()).filter(item => item);
        }
    }
    
    if (sistemArray.length === 0) {
        return `<p style="line-height: 1.8; color: var(--medium-gray);">${sistemData}</p>`;
    }
    
    // Styling dengan icon check
    return `
        <div style="display: flex; flex-direction: column; gap: 0.8rem;">
            ${sistemArray.map(item => `
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                    <div style="background: var(--primary-teal); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0;">
                        ✓
                    </div>
                    <span style="color: var(--medium-gray); line-height: 1.5; flex: 1;">${item}</span>
                </div>
            `).join('')}
        </div>
    `;
}
async function loadPromosData() {
    const container = document.getElementById('promosContainer');
    const noPromoMessage = document.getElementById('noPromoMessage');
    
    if (!container) return;
    
    showLoading(container);
    
    try {
        const [promos, programs] = await Promise.all([
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROMOS,
                'getPromoAktif',
                {},
                CACHE_CONFIG.DURATIONS.SHORT
            ),
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROGRAMS,
                'getProgramAktif',
                {},
                CACHE_CONFIG.DURATIONS.DYNAMIC
            )
        ]);
        
        // FIX: Pastikan programs dan promos adalah array
        const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
        currentPromos = Array.isArray(promos) ? promos : (promos?.data || []);
        
        if (currentPromos.length === 0) {
            container.classList.add('hidden');
            if (noPromoMessage) noPromoMessage.classList.remove('hidden');
            return;
        }
        
        if (noPromoMessage) noPromoMessage.classList.add('hidden');
        container.classList.remove('hidden');
        
        container.innerHTML = currentPromos.map(promo => {
            // FIX: Gunakan programsArray yang sudah dipastikan sebagai array
            const program = programsArray.find(p => p.id_program === promo.id_program);
            const finalPrice = program ? program.harga * (1 - promo.diskon_percent / 100) : 0;
            const endDate = new Date(promo.tanggal_selesai);
            const today = new Date();
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            
            const discountAmount = program ? program.harga - finalPrice : 0;
            
            const promoImage = extractImageForPromo(promo, program);
            
            return `
    <div class="promo-card">
        <div class="promo-image-container">
            <img src="${promoImage}" 
                 alt="${promo.nama_promo}" 
                 class="promo-image"
                 loading="lazy"
                 onerror="this.src='${getDefaultPromoImage()}'">
            <div class="image-badge">🔥 PROMO</div>
        </div>
        <div class="promo-content">
            <h3 class="promo-title">${promo.nama_promo}</h3>
            <div class="promo-period">${program ? program.nama_program : 'Program Spesial'}</div>
            
            <p class="promo-description">${promo.deskripsi}</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0; padding: 1rem; background: #e8f5e8; border-radius: 5px;">
                <div>
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;">
                        ${promo.diskon_percent}%
                    </div>
                    <small>DISCOUNT</small>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: bold; color: #10b981;">
                        Hemat Rp ${discountAmount.toLocaleString('id-ID')}
                    </div>
                    <small>Potongan harga</small>
                </div>
            </div>
            
            ${program ? `
                <div style="text-align: center; margin: 1rem 0;">
                    <div style="text-decoration: line-through; color: #ef4444; font-size: 1.1rem;">
                        Rp ${program.harga.toLocaleString('id-ID')}
                    </div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                        Rp ${finalPrice.toLocaleString('id-ID')}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin: 1rem 0; padding: 0.8rem; background: #fff3e0; border-radius: 5px; text-align: center;">
                <div style="font-weight: bold; color: #f59e0b; margin-bottom: 0.5rem;">
                    ⏳ Promo berakhir dalam ${daysLeft} hari
                </div>
                <small style="color: #666;">
                    Berlaku sampai ${endDate.toLocaleDateString('id-ID', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </small>
            </div>
            
            <div class="promo-actions" style="display: flex; gap: 0.5rem;">
                <button class="btn btn-success" onclick="viewPromoDetail('${promo.id_promo}')" style="flex: 2; background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                🔥 Lihat Detail
                </button>
                <button class="btn btn-outline" onclick="downloadBrosurPromo('${promo.id_promo}', '${promo.nama_promo}')" 
                style="flex: 1; background: transparent; border: 2px solid #f59e0b; color: #f59e0b;"
                     title="Unduh Brosur Promo">
                📥 Brosur
                </button>
            </div>
        </div>
    </div>
`;
        }).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">❌ Gagal Memuat Promo</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadPromosData()" class="btn btn-primary">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
    }
}

function registerWithPromoConfirmation(programId, programName, promoData) {
    openPromoTermsModal(promoData);
    
    const confirmButton = document.querySelector('#promoTermsModal .btn-success');
    if (confirmButton) {
        confirmButton.replaceWith(confirmButton.cloneNode(true));
        
        const newButton = document.querySelector('#promoTermsModal .btn-success');
        newButton.onclick = function() {
            closePromoTermsModal();
            setTimeout(() => {
                registerForProgram(programId, programName);
            }, 300);
        };
        newButton.innerHTML = '🎯 Daftar Sekarang dengan Promo';
    }
}

function openPromoTermsModal(promoData) {
    currentProgramPromo = promoData;
    const modal = document.getElementById('promoTermsModal');
    const content = document.getElementById('promoTermsContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = renderPromoTermsContent(promoData);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePromoTermsModal() {
    const modal = document.getElementById('promoTermsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function renderPromoTermsContent(promoData) {
    const endDate = new Date(promoData.tanggal_selesai);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    const syaratKetentuan = promoData.syarat_ketentuan || 
        'Promo berlaku untuk pendaftaran baru, Tidak dapat digabung dengan promo lain, Berlaku sampai tanggal yang ditentukan, Syarat dan ketentuan dapat berubah sewaktu-waktu';
    
    const caraKlaim = promoData.cara_klaim || 
        'Daftar melalui website atau hubungi admin, Mention kode promo saat pendaftaran, Promo akan secara otomatis diterapkan, Dapatkan konfirmasi dari admin';
    
    return `
        <div style="margin-bottom: 1.5rem;">
            <div style="background: linear-gradient(135deg, #fef3c7, #fed7aa); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ea580c; margin-bottom: 0.5rem;">
                        🎉 ${promoData.diskon_percent}% DISCOUNT
                    </div>
                    <div style="color: #ea580c; font-size: 0.9rem;">
                        Berlaku ${daysLeft} hari lagi • Sampai ${endDate.toLocaleDateString('id-ID')}
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--dark-gray); margin-bottom: 0.8rem; font-size: 1.1rem;">📝 Syarat & Ketentuan</h3>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                ${renderSyaratList(syaratKetentuan)}
            </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--dark-gray); margin-bottom: 0.8rem; font-size: 1.1rem;">🎁 Cara Klaim Promo</h3>
            <div style="background: #f0f9ff; padding: 1rem; border-radius: 8px;">
                ${renderCaraKlaimList(caraKlaim)}
            </div>
        </div>

        <div style="background: #fef2f2; padding: 1rem; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h4 style="color: #dc2626; margin-bottom: 0.5rem; font-size: 1rem;">⚠️ Penting!</h4>
            <p style="color: #dc2626; font-size: 0.9rem; margin: 0;">
                Promo ini terbatas dan dapat berubah sewaktu-waktu. Pastikan untuk mendaftar sebelum promo berakhir.
            </p>
        </div>
    `;
}

function renderSyaratList(syaratData) {
    let syaratArray = [];
    
    if (typeof syaratData === 'string') {
        if (syaratData.includes('\n')) {
            syaratArray = syaratData.split('\n').map(item => item.trim());
        } else {
            syaratArray = syaratData.split(',').map(item => item.trim());
        }
    }
    
    if (syaratArray.length === 0) {
        syaratArray = [
            'Promo berlaku untuk pendaftaran baru',
            'Tidak dapat digabung dengan promo lain',
            'Berlaku sampai tanggal yang ditentukan',
            'Syarat dan ketentuan dapat berubah sewaktu-waktu'
        ];
    }
    
    return `
        <ul style="list-style: none; padding: 0; margin: 0;">
            ${syaratArray.map(item => `
                <li style="padding: 0.5rem 0; display: flex; align-items: flex-start; gap: 0.8rem;">
                    <span style="color: #dc2626; font-weight: bold; flex-shrink: 0;">•</span>
                    <span style="color: var(--medium-gray); font-size: 0.9rem; line-height: 1.4;">${item}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderCaraKlaimList(caraData) {
    let caraArray = [];
    
    if (typeof caraData === 'string') {
        if (caraData.includes('\n')) {
            caraArray = caraData.split('\n').map(item => item.trim());
        } else {
            caraArray = caraData.split(',').map(item => item.trim());
        }
    }
    
    if (caraArray.length === 0) {
        caraArray = [
            'Daftar melalui website atau hubungi admin',
            'Mention kode promo saat pendaftaran',
            'Promo akan secara otomatis diterapkan',
            'Dapatkan konfirmasi dari admin'
        ];
    }
    
    return `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${caraArray.map((item, index) => `
                <div style="display: flex; gap: 0.8rem; align-items: flex-start;">
                    <div style="background: var(--primary-teal); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; flex-shrink: 0;">
                        ${index + 1}
                    </div>
                    <span style="color: var(--medium-gray); font-size: 0.9rem; line-height: 1.4; flex: 1;">${item}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function viewPromoDetail(promoId) {
    window.location.href = `promo-detail.html?id=${promoId}`;
}

async function loadPromoDetail() {
    const container = document.getElementById('promoDetailContainer');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const promoId = urlParams.get('id');

    if (!promoId) {
        container.innerHTML = `
            <div class="text-center" style="padding: 4rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Promo Tidak Ditemukan</h2>
                <p style="color: #666; margin-bottom: 2rem;">Promo yang Anda cari tidak tersedia.</p>
                <a href="promo.html" class="btn btn-primary">Kembali ke Daftar Promo</a>
            </div>
        `;
        return;
    }

    try {
        const [promos, programs] = await Promise.all([
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROMOS,
                'getPromoAktif',
                {},
                CACHE_CONFIG.DURATIONS.SHORT
            ),
            CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROGRAMS,
                'getProgramAktif',
                {},
                CACHE_CONFIG.DURATIONS.DYNAMIC
            )
        ]);

        // FIX: Pastikan promos dan programs adalah array sebelum menggunakan .find()
        const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
        const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
        
        const promo = promosArray.find(p => p.id_promo === promoId);
        
        if (!promo) {
            throw new Error('Promo tidak ditemukan');
        }

        const program = programsArray.find(p => p.id_program === promo.id_program);

        container.innerHTML = renderPromoDetailContent(promo, program);

    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="padding: 4rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Gagal Memuat Detail Promo</h2>
                <p style="color: #666; margin-bottom: 2rem;">${error.message}</p>
                <a href="promo.html" class="btn btn-primary">Kembali ke Daftar Promo</a>
            </div>
        `;
    }
}
function renderPromoDetailContent(promo, program) {
    const deskripsiPromo = promo.deskripsi_lengkap || promo.deskripsi || 'Promo spesial dengan penawaran terbatas. Jangan lewatkan kesempatan ini!';
    const syaratKetentuan = promo.syarat_ketentuan || 'Promo berlaku untuk pendaftaran baru, Tidak dapat digabung dengan promo lain, Berlaku sampai tanggal yang ditentukan';
    const caraKlaim = promo.cara_klaim || 'Daftar melalui website atau hubungi admin, Mention kode promo saat pendaftaran, Promo akan secara otomatis diterapkan';
    
    const finalPrice = program ? program.harga * (1 - promo.diskon_percent / 100) : 0;
    const discountAmount = program ? program.harga - finalPrice : 0;

    const endDate = new Date(promo.tanggal_selesai);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    return `
        <section class="hero" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">
            <div class="hero-content">
                <h1 class="hero-title">${promo.nama_promo}</h1>
                <p class="hero-subtitle">🔥 Promo Spesial Terbatas</p>
            </div>
        </section>

        <section class="programs" style="padding-top: 3rem;">
            <div class="program-detail-container" style="max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;">
                <div class="program-detail-grid" style="display: grid; grid-template-columns: 1fr 400px; gap: 3rem;">
                    
                    <div class="program-info">
                        <div class="program-image-container" style="border-radius: var(--border-radius); overflow: hidden; margin-bottom: 2rem;">
                            <img src="${extractImageForPromo(promo, program)}" 
                                 alt="${promo.nama_promo}" 
                                 class="program-image"
                                 style="width: 100%; height: 300px; object-fit: cover;"
                                 onerror="this.src='${getDefaultPromoImage()}'">
                            <div class="image-badge" style="position: absolute; top: 20px; right: 20px; background: #dc2626; color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold; font-size: 0.9rem;">
                                🔥 PROMO TERBATAS
                            </div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                                <h2 style="color: var(--dark-gray); margin: 0; font-family: 'Plus Jakarta Sans';">${promo.nama_promo}</h2>
                                <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold;">
                                    ${promo.diskon_percent}% OFF
                                </div>
                            </div>
                            
                            <div style="color: var(--medium-gray); line-height: 1.7; margin-bottom: 1.5rem;">
                                ${deskripsiPromo}
                            </div>

                            ${program ? `
                                <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 10px; border-left: 4px solid var(--primary-blue);">
                                    <h4 style="color: var(--primary-blue); margin-bottom: 0.5rem;">📚 Program Terkait</h4>
                                    <p style="color: var(--dark-gray); margin: 0; font-weight: 500;">${program.nama_program} - ${program.jenjang}</p>
                                </div>
                            ` : ''}
                        </div>

                        <div class="detail-section" style="background: linear-gradient(135deg, #fff7ed, #fed7aa); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem; border: 2px solid #f59e0b;">
                            <h3 style="color: #ea580c; margin-bottom: 1rem; text-align: center;">⏰ Promo Berakhir Dalam</h3>
                            <div style="text-align: center;">
                                <div style="font-size: 2.5rem; font-weight: bold; color: #ea580c; margin-bottom: 0.5rem;">
                                    ${daysLeft} Hari
                                </div>
                                <div style="color: #ea580c; font-size: 0.9rem;">
                                    Sampai ${endDate.toLocaleDateString('id-ID', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </div>
                            </div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem; font-family: 'Plus Jakarta Sans';">📋 Syarat & Ketentuan</h2>
                            <div>
                                ${renderSyaratKetentuan(syaratKetentuan)}
                            </div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft);">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem; font-family: 'Plus Jakarta Sans';">🎁 Cara Klaim Promo</h2>
                            <div>
                                ${renderCaraKlaim(caraKlaim)}
                            </div>
                        </div>
                    </div>

                    <div class="program-sidebar">
                        <div class="pricing-card" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); position: sticky; top: 100px; border: 2px solid #f59e0b;">
                            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem; text-align: center;">
                                <div style="font-size: 1.8rem; font-weight: bold;">HEMAT ${promo.diskon_percent}%</div>
                                <div>Rp ${discountAmount.toLocaleString('id-ID')}</div>
                            </div>

                            ${program ? `
                                <div style="text-align: center; margin-bottom: 2rem;">
                                    <div style="text-decoration: line-through; color: var(--medium-gray); font-size: 1.2rem; margin-bottom: 0.5rem;">
                                        Rp ${program.harga.toLocaleString('id-ID')}
                                    </div>
                                    <div style="font-size: 2.5rem; font-weight: 700; color: #dc2626;">
                                        Rp ${finalPrice.toLocaleString('id-ID')}
                                    </div>
                                    <div style="color: var(--medium-gray); font-size: 0.9rem; margin-top: 0.5rem;">
                                        Per ${program.periode || 'bulan'}
                                    </div>
                                </div>
                            ` : `
                                <div style="text-align: center; margin-bottom: 2rem;">
                                    <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">
                                        Diskon ${promo.diskon_percent}%
                                    </div>
                                    <div style="color: var(--medium-gray); font-size: 0.9rem; margin-top: 0.5rem;">
                                        Untuk program terpilih
                                    </div>
                                </div>
                            `}

                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                ${program ? `
                                    <button class="btn btn-success" onclick="registerForProgram('${program.id_program}', '${program.nama_program}')" style="padding: 1rem 2rem; font-size: 1.1rem; background: linear-gradient(135deg, #dc2626, #ef4444);">
                                        🎯 Daftar Sekarang
                                    </button>
                                ` : `
                                    <button class="btn btn-success" onclick="location.href='program.html'" style="padding: 1rem 2rem; font-size: 1.1rem; background: linear-gradient(135deg, #dc2626, #ef4444);">
                                        🎯 Lihat Program
                                    </button>
                                `}
                                
                                <button class="btn btn-outline" onclick="downloadBrosurPromo('${promo.id_promo}', '${promo.nama_promo}')" 
                                    style="padding: 1rem 2rem; font-size: 1.1rem; background: transparent; border: 2px solid #f59e0b; color: #f59e0b;">
                                    📥 Download Brosur Promo
                                </button>
                                
                                <a href="promo.html" class="btn" style="padding: 1rem 2rem; font-size: 1.1rem; background: var(--light-gray); color: var(--dark-gray); text-align: center; text-decoration: none;">
                                    ← Kembali ke Promo
                                </a>
                            </div>

                            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--light-gray);">
                                <h4 style="color: var(--dark-gray); margin-bottom: 1rem;">💡 Butuh Bantuan?</h4>
                                <p style="color: var(--medium-gray); font-size: 0.9rem; margin-bottom: 1rem;">
                                    Konsultasi gratis dengan konsultan kami
                                </p>
                                <a href="https://wa.me/6285180649460" target="_blank" class="btn" style="background: #25D366; color: white; padding: 0.8rem 1.5rem; text-decoration: none; display: block; text-align: center;">
                                    💬 Chat WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderSyaratKetentuan(syaratData) {
    let syaratArray = [];
    
    if (typeof syaratData === 'string') {
        if (syaratData.includes('\n')) {
            syaratArray = syaratData.split('\n').map(item => item.trim());
        } else {
            syaratArray = syaratData.split(',').map(item => item.trim());
        }
    }
    
    if (syaratArray.length === 0) {
        syaratArray = [
            'Promo berlaku untuk pendaftaran baru',
            'Tidak dapat digabung dengan promo lain',
            'Berlaku sampai tanggal yang ditentukan',
            'Syarat dan ketentuan dapat berubah sewaktu-waktu'
        ];
    }
    
    return `
        <ul style="list-style: none; padding: 0;">
            ${syaratArray.map(item => `
                <li style="padding: 0.8rem 0; border-bottom: 1px solid var(--light-gray); display: flex; align-items: center; gap: 1rem;">
                    <span style="color: #dc2626; font-weight: bold; font-size: 1.2rem;">!</span>
                    ${item}
                </li>
            `).join('')}
        </ul>
    `;
}

function renderCaraKlaim(caraData) {
    let caraArray = [];
    
    if (typeof caraData === 'string') {
        if (caraData.includes('\n')) {
            caraArray = caraData.split('\n').map(item => item.trim());
        } else {
            caraArray = caraData.split(',').map(item => item.trim());
        }
    }
    
    if (caraArray.length === 0) {
        caraArray = [
            'Daftar melalui website atau hubungi admin',
            'Mention kode promo saat pendaftaran',
            'Promo akan secara otomatis diterapkan',
            'Dapatkan konfirmasi dari admin'
        ];
    }
    
    return `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${caraArray.map((item, index) => `
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                        ${index + 1}
                    </div>
                    <div style="line-height: 1.6; color: var(--medium-gray); flex: 1;">
                        ${item}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadTestimonialsData() {
    const container = document.getElementById('testimonialsContainer');
    const noTestimonialsMessage = document.getElementById('noTestimonialsMessage');
    
    if (!container) return;
    
    showLoading(container);
    
    try {
        const response = await callGoogleScript('getTestimoniAktif', {});
        
        if (!response.success) {
            throw new Error(response.message);
        }
        
        const testimonials = response.data;
        
        if (testimonials.length === 0) {
            container.classList.add('hidden');
            if (noTestimonialsMessage) noTestimonialsMessage.classList.remove('hidden');
            return;
        }
        
        if (noTestimonialsMessage) noTestimonialsMessage.classList.add('hidden');
        container.classList.remove('hidden');
        
        container.innerHTML = testimonials.map(testimoni => `
            <div class="testimonial-card" style="position: relative;">
                <div class="testimonial-content">
                    "${testimoni.isi_testimoni}"
                </div>
                <div class="testimonial-author">
                    <div class="author-avatar" style="background: #1e3a5f; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.5rem;">
                        ${testimoni.nama.charAt(0)}
                    </div>
                    <div class="author-info">
                        <h4>${testimoni.nama}</h4>
                        <p>${testimoni.asal_sekolah}</p>
                        <div style="color: #ffc107; font-size: 0.9rem; margin-top: 0.2rem;">
                            ⭐⭐⭐⭐⭐
                        </div>
                    </div>
                </div>
                <div style="position: absolute; top: 10px; right: 10px; color: #e0e0e0; font-size: 3rem;">
                    ”
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">❌ Gagal Memuat Testimoni</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <button onclick="loadTestimonialsData()" class="btn btn-primary">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
    }
}

async function loadKarirData() {
    const container = document.getElementById('karirContainer');
    if (!container) {
        return;
    }
    
    showLoading(container);
    
    try {
        const response = await callGoogleScript('getKarirAktif', {});
        
        if (!response.success) {
            throw new Error(response.message);
        }
        
        const karirList = response.data || [];
        
        if (karirList.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <h3 style="color: #666; margin-bottom: 1rem;">💼 Belum Ada Lowongan</h3>
                    <p style="color: #999;">Saat ini belum ada lowongan pekerjaan yang tersedia.</p>
                    <p style="color: #999;">Silakan cek kembali di lain waktu atau hubungi kami untuk informasi lebih lanjut.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = karirList.map(karir => {
            const deadline = new Date(karir.tanggal_selesai);
            const today = new Date();
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            
            const karirImage = extractImageForKarir(karir);
            
            return `
                <div class="program-card">
                    <div class="program-image-container">
                        <img src="${karirImage}" 
                             alt="${karir.judul_lowongan}" 
                             class="program-image"
                             loading="lazy"
                             onerror="this.src='${getDefaultKarirImage()}'">
                        <div class="image-badge">💼 ${karir.jenis_pekerjaan || 'Tutor'}</div>
                    </div>
                    <div class="program-content">
                        <h3 class="program-title">${karir.judul_lowongan || 'Lowongan Tutor'}</h3>
                        <div class="program-jenjang">${karir.departemen || 'Pendidikan'}</div>
                        
                        <p class="program-description">${karir.deskripsi_singkat || karir.deskripsi_lowongan?.substring(0, 100) + '...' || 'Bergabunglah dengan tim pengajar profesional Smart Catalyst'}</p>
                        
                        <div style="margin: 1rem 0; padding: 1rem; background: #f0f9ff; border-radius: 5px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <strong style="color: var(--primary-blue);">📍 Lokasi:</strong>
                                <span style="color: var(--medium-gray);">${karir.lokasi || 'Pringsewu, Lampung'}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: var(--primary-blue);">🕒 Tipe:</strong>
                                <span style="color: var(--medium-gray);">${karir.jenis_pekerjaan || 'Part-Time'}</span>
                            </div>
                        </div>
                        
                        <div style="margin: 1rem 0; padding: 0.8rem; background: ${daysLeft <= 7 ? '#fef2f2' : '#fff7ed'}; border-radius: 5px; text-align: center;">
                            <div style="font-weight: bold; color: ${daysLeft <= 7 ? '#dc2626' : '#f59e0b'};">
                                ⏳ ${daysLeft > 0 ? `Tutup dalam ${daysLeft} hari` : 'Segera tutup'}
                            </div>
                            <small style="color: #666;">
                                Batas: ${deadline.toLocaleDateString('id-ID')}
                            </small>
                        </div>
                        
                        <div class="program-actions" style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-success" onclick="viewKarirDetail('${karir.id_karir}')" style="flex: 2;">
                                📋 Lihat Detail
                            </button>
                            <button class="btn btn-outline" onclick="applyForKarir('${karir.id_karir}', '${karir.judul_lowongan}')" 
                                style="flex: 1; background: transparent; border: 2px solid var(--primary-teal); color: var(--primary-teal);">
                                ✉️ Lamar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">❌ Gagal Memuat Lowongan</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">${error.message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="loadKarirData()" class="btn btn-primary">
                        🔄 Coba Lagi
                    </button>
                    <a href="https://wa.me/6285180649460" target="_blank" class="btn btn-success">
                        💬 Tanya Admin
                    </a>
                </div>
            </div>
        `;
    }
}

async function loadKarirDetail() {
    const container = document.getElementById('karirDetailContainer');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const karirId = urlParams.get('id');

    if (!karirId) {
        container.innerHTML = `
            <div class="text-center" style="padding: 4rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Lowongan Tidak Ditemukan</h2>
                <p style="color: #666; margin-bottom: 2rem;">Lowongan yang Anda cari tidak tersedia.</p>
                <a href="karir.html" class="btn btn-primary">Kembali ke Lowongan</a>
            </div>
        `;
        return;
    }

    try {
        const response = await callGoogleScript('getKarirDetail', { id: karirId });
        
        if (!response.success) {
            throw new Error(response.message);
        }

        const karir = response.data;
        
        if (!karir) {
            throw new Error('Lowongan tidak ditemukan');
        }

        container.innerHTML = renderKarirDetailContent(karir);

    } catch (error) {
        container.innerHTML = `
            <div class="text-center" style="padding: 4rem;">
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Gagal Memuat Detail Lowongan</h2>
                <p style="color: #666; margin-bottom: 2rem;">${error.message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <a href="karir.html" class="btn btn-primary">Kembali ke Lowongan</a>
                    <button onclick="loadKarirDetail()" class="btn btn-success">
                        🔄 Coba Lagi
                    </button>
                </div>
            </div>
        `;
    }
}

function renderKarirDetailContent(karir) {
    const deadline = new Date(karir.tanggal_selesai);
    const today = new Date();
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    
    const deskripsiLengkap = karir.deskripsi_lowongan || karir.deskripsi_singkat || 'Lowongan pekerjaan sebagai tutor profesional di Smart Catalyst.';
    const kualifikasi = karir.kualifikasi || 'Pendidikan minimal S1, Pengalaman mengajar minimal 1 tahun, Menguasai materi pelajaran dengan baik';
    const tanggungJawab = karir.tanggung_jawab || 'Mengajar siswa sesuai jadwal, Membuat rencana pembelajaran, Mengevaluasi perkembangan siswa';
    const benefit = karir.benefit || 'Gaji kompetitif, Jam kerja fleksibel, Pelatihan pengembangan diri, Lingkungan kerja yang supportive';

    return `
        <section class="hero" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <div class="hero-content">
                <h1 class="hero-title">${karir.judul_lowongan}</h1>
                <p class="hero-subtitle">${karir.departemen || 'Departemen Pendidikan'} • ${karir.lokasi || 'Pringsewu, Lampung'}</p>
            </div>
        </section>

        <section class="programs" style="padding-top: 3rem;">
            <div class="program-detail-container" style="max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;">
                <div class="program-detail-grid" style="display: grid; grid-template-columns: 1fr 400px; gap: 3rem;">
                    
                    <div class="program-info">
                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem; font-family: 'Plus Jakarta Sans';">📖 Deskripsi Pekerjaan</h2>
                            <div style="line-height: 1.8; color: var(--medium-gray); white-space: pre-line;">
                                ${deskripsiLengkap}
                            </div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem; font-family: 'Plus Jakarta Sans';">🎯 Kualifikasi & Persyaratan</h2>
                            <div style="line-height: 1.8; color: var(--medium-gray);">
                                ${renderListFromText(kualifikasi)}
                            </div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem; font-family: 'Plus Jakarta Sans';">📋 Tanggung Jawab</h2>
                            <div style="line-height: 1.8; color: var(--medium-gray);">
                                ${renderListFromText(tanggungJawab)}
                            </div>
                        </div>

                        <div class="detail-section" style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                            <h2 style="color: var(--dark-gray); margin-bottom: 1.5rem; font-family: 'Plus Jakarta Sans';">🎁 Benefit & Fasilitas</h2>
                            <div style="line-height: 1.8; color: var(--medium-gray);">
                                ${renderListFromText(benefit)}
                            </div>
                        </div>
                    </div>

                    <div class="program-sidebar">
                        <div style="position: sticky; top: 100px;">
                            <div style="background: var(--white); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-soft); margin-bottom: 2rem;">
                                <h3 style="color: var(--dark-gray); margin-bottom: 1.5rem; text-align: center;">📋 Info Lowongan</h3>
                                
                                <div style="margin-bottom: 1.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--light-gray);">
                                        <strong style="color: var(--primary-blue);">💼 Posisi:</strong>
                                        <span style="color: var(--medium-gray);">${karir.judul_lowongan}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--light-gray);">
                                        <strong style="color: var(--primary-blue);">🏢 Departemen:</strong>
                                        <span style="color: var(--medium-gray);">${karir.departemen || 'Pendidikan'}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--light-gray);">
                                        <strong style="color: var(--primary-blue);">📍 Lokasi:</strong>
                                        <span style="color: var(--medium-gray);">${karir.lokasi || 'Pringsewu, Lampung'}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--light-gray);">
                                        <strong style="color: var(--primary-blue);">🕒 Tipe:</strong>
                                        <span style="color: var(--medium-gray);">${karir.jenis_pekerjaan}</span>
                                    </div>
                                </div>

                                <div style="background: ${daysLeft <= 7 ? '#fef2f2' : '#fff7ed'}; padding: 1rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
                                    <div style="font-weight: bold; color: ${daysLeft <= 7 ? '#dc2626' : '#f59e0b'}; margin-bottom: 0.5rem;">
                                        ⏳ ${daysLeft > 0 ? `Tutup dalam ${daysLeft} hari` : 'Segera tutup'}
                                    </div>
                                    <small style="color: #666;">
                                        Batas: ${deadline.toLocaleDateString('id-ID')}
                                    </small>
                                </div>

                                <button onclick="applyForKarir('${karir.id_karir}', '${karir.judul_lowongan}')" 
                                        class="btn btn-success btn-block"
                                        style="padding: 1rem 2rem; font-size: 1.1rem; width: 100%;">
                                    📨 Lamar Pekerjaan Ini
                                </button>
                            </div>

                            <a href="karir.html" class="btn btn-outline btn-block" 
                               style="padding: 1rem 2rem; text-align: center; display: block; text-decoration: none;">
                                ← Kembali ke Lowongan
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}
function extractImageForKarir(karir) {
    
    const possibleImageFields = [
        karir.gambar,
        karir.N,
        karir.O,
        karir.P,
        karir.image,
        karir.foto,
        karir.photo,
        karir.img,
        karir.picture,
        karir.url_gambar,
        karir.link_gambar,
        karir.gambar_url,
        ...Object.values(karir).filter(val => 
            typeof val === 'string' && 
            val.includes('http') && 
            (val.includes('drive.google.com') || val.includes('.jpg') || val.includes('.png') || val.includes('.jpeg'))
        )
    ];
    
    for (const imageUrl of possibleImageFields) {
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' && imageUrl.includes('http')) {
            
            if (imageUrl.includes('drive.google.com')) {
                const convertedUrl = convertGoogleDriveLink(imageUrl);
                return convertedUrl;
            }
            
            return imageUrl;
        }
    }
    
    return getDefaultKarirImage();
}

function getDefaultKarirImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM4QjVDNEYiLz4KPHRleHQgeD0iMjAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5Mb3dvbmdhbiBLZXJqYTwvdGV4dD4KPC9zdmc+';
}

function renderListFromText(text) {
    if (!text) return '<p>- Tidak ada informasi</p>';
    
    // Split text menjadi array berdasarkan koma atau newline
    let items = [];
    
    if (typeof text === 'string') {
        if (text.includes('\n')) {
            items = text.split('\n').map(item => item.trim()).filter(item => item);
        } else {
            items = text.split(',').map(item => item.trim()).filter(item => item);
        }
    }
    
    if (items.length === 0) return '<p>- Tidak ada informasi</p>';
    
    // Return sebagai unordered list
    return `
        <ul style="list-style: none; padding: 0; margin: 0;">
            ${items.map(item => `
                <li style="padding: 0.5rem 0; display: flex; align-items: flex-start; gap: 0.8rem;">
                    <span style="color: var(--primary-teal); font-weight: bold; flex-shrink: 0;">•</span>
                    <span style="color: var(--medium-gray); line-height: 1.5;">${item}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function viewKarirDetail(karirId) {
    window.location.href = `karir-detail.html?id=${karirId}`;
}

function applyForKarir(karirId, karirName) {
    localStorage.setItem('selectedKarirId', karirId);
    localStorage.setItem('selectedKarirName', karirName);
    window.location.href = 'registrasi-tutor.html';
}

function autoSelectKarirInForm() {
    const karirId = localStorage.getItem('selectedKarirId');
    const karirName = localStorage.getItem('selectedKarirName');
    
    if (karirId && karirName) {
        const feedbackElement = document.getElementById('autoSelectFeedback');
        const karirNameElement = document.getElementById('selectedKarirName');
        
        if (feedbackElement && karirNameElement) {
            feedbackElement.classList.remove('hidden');
            karirNameElement.textContent = karirName;
        }
    }
}

function registerForProgram(programId, programName) {
    sessionStorage.setItem('selectedProgramId', programId);
    sessionStorage.setItem('selectedProgramName', programName);
    window.location.href = `registrasi.html?program=${programId}`;
}

function initializeRegistrationForm() {
    const programSelect = document.getElementById('programSelect');
    const privateForm = document.getElementById('privateForm');
    const groupForm = document.getElementById('groupForm');
    const initialMessage = document.getElementById('initialMessage');
    
    if (programSelect) {
        loadProgramsForRegistration();
        
        programSelect.addEventListener('change', function() {
            const programsArray = Array.isArray(currentPrograms) ? currentPrograms : [];
            const selectedProgram = programsArray.find(p => p.id_program === this.value);
            
            if (selectedProgram) {
                const isPrivate = selectedProgram.jenis_kelas && 
                                selectedProgram.jenis_kelas.toLowerCase().includes('private');
                
                if (initialMessage) initialMessage.classList.add('hidden');
                
                if (isPrivate) {
                    privateForm.classList.remove('hidden');
                    groupForm.classList.add('hidden');
                } else {
                    privateForm.classList.add('hidden');
                    groupForm.classList.remove('hidden');
                }
            } else {
                if (initialMessage) initialMessage.classList.remove('hidden');
                privateForm.classList.add('hidden');
                groupForm.classList.add('hidden');
            }
        });
        
        autoSelectProgramFromURL();
    }
    
    const privateFormElement = document.getElementById('privateRegistrationForm');
    const groupFormElement = document.getElementById('groupRegistrationForm');
    
    if (privateFormElement) {
        privateFormElement.addEventListener('submit', handlePrivateRegistration);
    }
    
    if (groupFormElement) {
        groupFormElement.addEventListener('submit', handleGroupRegistration);
    }
    
    setupClassOptions();
    
    const checkboxes = document.querySelectorAll('input[name="jadwal_hari"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[name="jadwal_hari"]:checked').length;
            if (checkedCount > 3) {
                showError('Maksimal 3 hari belajar yang dapat dipilih');
                this.checked = false;
            }
        });
    });
}

function autoSelectProgramFromURL() {
    const programSelect = document.getElementById('programSelect');
    const feedbackElement = document.getElementById('autoSelectFeedback');
    const programNameElement = document.getElementById('selectedProgramName');
    
    if (!programSelect) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const programParam = urlParams.get('program');
    const sessionProgramId = sessionStorage.getItem('selectedProgramId');
    const sessionProgramName = sessionStorage.getItem('selectedProgramName');
    
    const programIdToSelect = programParam || sessionProgramId;
    const programNameToShow = sessionProgramName;
    
    if (programIdToSelect && programSelect) {
        let attempts = 0;
        const maxAttempts = 30;
        
        const trySelectProgram = setInterval(() => {
            attempts++;
            
            if (programSelect.options.length > 1) {
                programSelect.value = programIdToSelect;
                
                if (feedbackElement && programNameToShow) {
                    programNameElement.textContent = programNameToShow;
                    feedbackElement.classList.remove('hidden');
                }
                
                const changeEvent = new Event('change');
                programSelect.dispatchEvent(changeEvent);
                
                setTimeout(() => {
                    const formElement = document.getElementById('privateForm') || 
                                      document.getElementById('groupForm');
                    if (formElement) {
                        formElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }
                }, 500);
                
                sessionStorage.removeItem('selectedProgramId');
                sessionStorage.removeItem('selectedProgramName');
                
                clearInterval(trySelectProgram);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(trySelectProgram);
            }
        }, 100);
    }
}

async function loadProgramsForRegistration() {
    const programSelect = document.getElementById('programSelect');
    if (!programSelect) return;
    
    try {
        const programs = await CacheManager.loadWithCache(
            CACHE_CONFIG.KEYS.PROGRAMS,
            'getProgramAktif',
            {},
            CACHE_CONFIG.DURATIONS.DYNAMIC
        );
        
        // PASTIKAN programs adalah array sebelum disimpan
        const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
        currentPrograms = programsArray; // Simpan sebagai array
        
        if (programsArray.length === 0) {
            programSelect.innerHTML = '<option value="">Tidak ada program tersedia</option>';
            return;
        }
        
        programSelect.innerHTML = '<option value="">Pilih Program...</option>' +
            programsArray.map(program => `
                <option value="${program.id_program}">
                    ${program.nama_program} - ${program.jenjang} (Rp ${program.harga.toLocaleString('id-ID')})
                </option>
            `).join('');
    } catch (error) {
        console.error('Error loading programs for registration:', error);
        programSelect.innerHTML = '<option value="">Gagal memuat program</option>';
        currentPrograms = []; // Reset ke array kosong jika error
    }
}

async function handlePrivateRegistration(e) {
  e.preventDefault();
  
  try {
    const formData = new FormData(e.target);
    const programId = document.getElementById('programSelect')?.value;

    for (let [key, value] of formData.entries()) {
    }
    
    // DAPATKAN DATA PROGRAM DAN PROMO
    let programData = null;
    let promoData = null;
    
    if (programId) {
      
      const [programs, promos] = await Promise.all([
        CacheManager.loadWithCache(
          CACHE_CONFIG.KEYS.PROGRAMS,
          'getProgramAktif',
          {},
          CACHE_CONFIG.DURATIONS.DYNAMIC
        ),
        CacheManager.loadWithCache(
          CACHE_CONFIG.KEYS.PROMOS,
          'getPromoAktif',
          {},
          CACHE_CONFIG.DURATIONS.SHORT
        )
      ]);

      const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
      const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
      
      programData = programsArray.find(p => p.id_program === programId);
      promoData = promosArray.find(p => p.id_program === programId);
      
    }

    // PROSES MATA PELAJARAN DENGAN HANDLER "LAINNYA"
    const mataPelajaranValues = Array.from(formData.getAll('mata_pelajaran'));
    const lainnyaCheckbox = document.getElementById('mata_pelajaran_lainnya');
    const lainnyaInput = document.getElementById('mata_pelajaran_lainnya_input');
    
    
    // Jika "Lainnya" dipilih dan ada input, proses
    if (lainnyaCheckbox && lainnyaCheckbox.checked && lainnyaInput && lainnyaInput.value.trim()) {
      // Hapus value "other" dari array jika ada
      const filteredMataPelajaran = mataPelajaranValues.filter(item => item !== 'other');
      // Tambahkan nilai dari input lainnya
      filteredMataPelajaran.push(lainnyaInput.value.trim());
      mataPelajaranValues.length = 0; // Clear array
      mataPelajaranValues.push(...filteredMataPelajaran);
    }

    // ✅ PERBAIKAN: Hanya include data promo jika ada promo aktif
    const baseData = {
      nama_siswa: formData.get('nama_siswa'),
      jenis_kelamin: formData.get('jenis_kelamin'),
      alamat: formData.get('alamat'),
      mata_pelajaran: mataPelajaranValues,
      tempat_lahir: formData.get('tempat_lahir'),
      tanggal_lahir: formData.get('tanggal_lahir'),
      jenjang: formData.get('jenjang'),
      kelas: formData.get('kelas'),
      asal_sekolah: formData.get('asal_sekolah'),
      nama_ortu: formData.get('nama_ortu'),
      no_hp_ortu: formData.get('no_hp_ortu'),
      pekerjaan_ortu: formData.get('pekerjaan_ortu'),
      program_daftar: programId,
      jadwal_hari: Array.from(formData.getAll('jadwal_hari')),
      jadwal_jam: formData.get('jadwal_jam'),
      prefrensi_tutor: formData.get('prefrensi_tutor'),
      kesulitan_belajar: formData.get('kesulitan_belajar')
    };

    // ✅ TAMBAHKAN DATA PROMO HANYA JIKA ADA PROMO AKTIF
    let finalData = { ...baseData };
    
    if (promoData && programData) {
      const finalHarga = programData.harga * (1 - promoData.diskon_percent / 100);
      
      finalData = {
        ...baseData,
        // DATA PROMO
        harga_asli: programData.harga || 0,
        harga_setelah_diskon: finalHarga,
        menggunakan_promo: true,
        id_promo: promoData.id_promo || '',
        diskon_percent: promoData.diskon_percent || 0
      };
    } else {

      // Jika tidak ada promo, gunakan harga normal
      finalData = {
        ...baseData,
        harga_asli: programData?.harga || 0,
        harga_setelah_diskon: programData?.harga || 0,
        menggunakan_promo: false,
        id_promo: '',
        diskon_percent: 0
      };
    }

    if (!validasiFormPrivate(finalData)) {
      return;
    }


    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    
    const response = await callGoogleScript('simpanPendaftaranPrivate', finalData);

    
    if (response.success) {
      let successMessage = response.message || 'Pendaftaran berhasil! Kami akan menghubungi Anda dalam 1x24 jam.';
      
      // ✅ Tampilkan info promo hanya jika ada promo
      if (promoData && programData) {
        const finalHarga = programData.harga * (1 - promoData.diskon_percent / 100);
        successMessage += `\n\n🎉 Anda mendapatkan promo ${promoData.diskon_percent}%!`;
        successMessage += `\nHarga normal: Rp ${programData.harga.toLocaleString('id-ID')}`;
        successMessage += `\nHarga setelah diskon: Rp ${finalHarga.toLocaleString('id-ID')}`;
      }
      
      showSuccess(successMessage);
      e.target.reset();
      
      const programSelect = document.getElementById('programSelect');
      if (programSelect) programSelect.value = '';
      
      const initialMessage = document.getElementById('initialMessage');
      const privateForm = document.getElementById('privateForm');
      if (initialMessage) initialMessage.classList.remove('hidden');
      if (privateForm) privateForm.classList.add('hidden');
      
      const feedbackElement = document.getElementById('autoSelectFeedback');
      if (feedbackElement) feedbackElement.classList.add('hidden');
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error('❌ Error in handlePrivateRegistration:', error);
    showError('Gagal mengirim pendaftaran: ' + error.message);
  } finally {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Pendaftaran';
    }
  }
}

async function handleGroupRegistration(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const programId = document.getElementById('programSelect')?.value;
        
        // DAPATKAN DATA PROMO UNTUK PROGRAM INI
        let finalHarga = 0;
        let promoData = null;
        let programData = null; // ✅ TAMBAHKAN VARIABLE UNTUK PROGRAM
        
        if (programId) {
            const [programs, promos] = await Promise.all([
                CacheManager.loadWithCache(
                    CACHE_CONFIG.KEYS.PROGRAMS,
                    'getProgramAktif',
                    {},
                    CACHE_CONFIG.DURATIONS.DYNAMIC
                ),
                CacheManager.loadWithCache(
                    CACHE_CONFIG.KEYS.PROMOS,
                    'getPromoAktif',
                    {},
                    CACHE_CONFIG.DURATIONS.SHORT
                )
            ]);

            const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
            const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
            
            programData = programsArray.find(p => p.id_program === programId); // ✅ GUNAKAN VARIABLE BARU
            promoData = promosArray.find(p => p.id_program === programId);
            
            if (programData) { // ✅ GUNAKAN programData
                finalHarga = promoData ? 
                    programData.harga * (1 - promoData.diskon_percent / 100) : 
                    programData.harga;
            }
        }

        const data = {
            nama_perwakilan: formData.get('nama_perwakilan'),
            asal_sekolah: formData.get('asal_sekolah'),
            jenjang: formData.get('jenjang'),
            kelas: formData.get('kelas'),
            jumlah_siswa: parseInt(formData.get('jumlah_siswa')),
            no_hp_perwakilan: formData.get('no_hp_perwakilan'),
            program_daftar: programId,
            jadwal_hari: Array.from(formData.getAll('jadwal_hari')),
            jadwal_jam: formData.get('jadwal_jam'),
            // TAMBAHKAN DATA PROMO - GUNAKAN programData
            harga_asli: programData?.harga || 0, // ✅ GUNAKAN programData
            harga_setelah_diskon: finalHarga,
            menggunakan_promo: !!promoData,
            id_promo: promoData?.id_promo || '',
            diskon_percent: promoData?.diskon_percent || 0
        };

        if (!validasiFormGroup(data)) {
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';
        
        const response = await callGoogleScript('simpanPendaftaranGroup', data);
        
        if (response.success) {
            let successMessage = response.message || 'Pendaftaran group berhasil! Kami akan menghubungi perwakilan dalam 1x24 jam.';
            
            // TAMBAHKAN INFORMASI PROMO - GUNAKAN programData
            if (promoData && programData) { // ✅ GUNAKAN programData
                successMessage += `\n\n🎉 Group mendapatkan promo ${promoData.diskon_percent}%!`;
                successMessage += `\nHarga normal per siswa: Rp ${programData.harga.toLocaleString('id-ID')}`;
                successMessage += `\nHarga setelah diskon: Rp ${finalHarga.toLocaleString('id-ID')}`;
            }
            
            showSuccess(successMessage);
            e.target.reset();
            
            const programSelect = document.getElementById('programSelect');
            if (programSelect) programSelect.value = '';
            
            const initialMessage = document.getElementById('initialMessage');
            const groupForm = document.getElementById('groupForm');
            if (initialMessage) initialMessage.classList.remove('hidden');
            if (groupForm) groupForm.classList.add('hidden');
            
            const feedbackElement = document.getElementById('autoSelectFeedback');
            if (feedbackElement) feedbackElement.classList.add('hidden');
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        showError('Gagal mengirim pendaftaran: ' + error.message);
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Pendaftaran Group';
        }
    }
}

function setupGoogleDriveValidation() {
    const driveInputs = [
        { id: 'foto_url', type: 'foto' },
        { id: 'cv_url', type: 'cv' },
        { id: 'kesepakatan_kerja_url', type: 'kerja' }
    ];
    
    driveInputs.forEach(input => {
        const element = document.getElementById(input.id);
        if (element) {
            element.addEventListener('blur', function() {
                validateGoogleDriveLink(this, input.type);
            });
            
            if (element.value) {
                validateGoogleDriveLink(element, input.type);
            }
        }
    });
}

function validasiFormPrivate(data) {
  const requiredFields = [
    'nama_siswa', 'jenis_kelamin', 'alamat', 'tempat_lahir', 
    'tanggal_lahir', 'jenjang', 'kelas', 'asal_sekolah', 'nama_ortu', 'no_hp_ortu',
    'kesulitan_belajar'
  ];
  
  for (let field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      showError(`Field ${field.replace('_', ' ')} harus diisi`);
      return false;
    }
  }
  
  // VALIDASI MATA PELAJARAN
  if (!data.mata_pelajaran || data.mata_pelajaran.length === 0) {
    showError('Pilih minimal satu mata pelajaran');
    return false;
  }
  
  // VALIDASI JAM BELAJAR
  if (!data.jadwal_jam || data.jadwal_jam.toString().trim() === '') {
    showError('Pilih jam belajar');
    return false;
  }
  
  if (!data.jadwal_hari || data.jadwal_hari.length === 0) {
    showError('Pilih minimal satu hari belajar');
    return false;
  }
  
  const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
  if (!phoneRegex.test(data.no_hp_ortu)) {
    showError('Format nomor HP tidak valid');
    return false;
  }
  
  return true;
}

function validasiFormGroup(data) {
    const requiredFields = [
        'nama_perwakilan', 'asal_sekolah', 'jenjang', 'kelas', 
        'jumlah_siswa', 'no_hp_perwakilan'
    ];
    
    for (let field of requiredFields) {
        if (!data[field] || data[field].toString().trim() === '') {
            showError(`Field ${field.replace('_', ' ')} harus diisi`);
            return false;
        }
    }
    
    if (!data.jadwal_hari || data.jadwal_hari.length === 0) {
        showError('Pilih minimal satu hari belajar');
        return false;
    }
    
    // VALIDASI JAM BELAJAR
    if (!data.jadwal_jam || data.jadwal_jam.toString().trim() === '') {
        showError('Pilih jam belajar');
        return false;
    }
    
    if (data.jumlah_siswa < 2 || data.jumlah_siswa > 20) {
        showError('Jumlah siswa harus antara 2-20 orang');
        return false;
    }
    
    return true;
}

function extractImageFromProgram(program) {
    // Prioritas: kolom program.I (kolom N)
    const possibleImageFields = [
        program['program.I'], // Kolom N
        program.gambar_program,
        program.gambar,
        program.image,
        program.url_gambar,
        program.link_gambar,
        program.foto,
        program.photo,
        program.img,
        program.picture
    ];
    
    for (const imageUrl of possibleImageFields) {
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' && imageUrl.includes('http')) {
            if (imageUrl.includes('drive.google.com')) {
                const convertedUrl = convertGoogleDriveLink(imageUrl);
                return convertedUrl;
            }
            return imageUrl;
        }
    }
    
    return getDefaultProgramImage(program.jenjang);
}

function convertGoogleDriveLink(originalUrl) {
    let fileId = '';
    
    const match1 = originalUrl.match(/\/d\/([^\/]+)/);
    if (match1) fileId = match1[1];
    
    const match2 = originalUrl.match(/[?&]id=([^&]+)/);
    if (match2) fileId = match2[1];
    
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
    }
    
    return originalUrl;
}

function getDefaultProgramImage(jenjang) {
    const images = {
        'SD': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM0Q0FGNTAiLz4KPHRleHQgeD0iMjAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5Qcm9ncmFtIFNEPC90ZXh0Pgo8L3N2Zz4=',
        'SMP': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyMTk2RjMiLz4KPHRleHQgeD0iMjAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5Qcm9ncmFtIFNNUDwvdGV4dD4KPC9zdmc+',
        'SMA': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM5QzI3QjAiLz4KPHRleHQgeD0iMjAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5Qcm9ncmFtIFNNQTwvdGV4dD4KPC9zdmc+'
    };
    
    return images[jenjang] || images.SD;
}

function getDefaultPromoImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNTllMGIiLz4KPHRleHQgeD0iMjAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5Qcm9tb1NwZXNpYWw8L3RleHQ+Cjwvc3ZnPg==';
}

function getDefaultTestimonialImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMxNGI4YTYiLz4KPHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+U0M8L3RleHQ+Cjwvc3ZnPg==';
}

function extractImageForPromo(promo, program) {
    
    const possibleImageFields = [
        promo.gambar_promo,
        promo.J,
        promo.gambar,
        promo.image,
        promo.foto,
        promo.photo
    ];
    
    for (const imageUrl of possibleImageFields) {
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' && imageUrl.includes('http')) {
            
            if (imageUrl.includes('drive.google.com')) {
                return convertGoogleDriveLink(imageUrl);
            }
            
            return imageUrl;
        }
    }
    
    if (program) {
        const programImage = extractImageFromProgram(program);
        if (programImage && programImage.includes('http')) {
            return programImage;
        }
    }
    
    return getDefaultPromoImage();
}

async function downloadBrosurProgram(programId, programName) {
    const button = event?.target;
    const originalText = button?.innerHTML || '📥 Brosur';
    
    try {
        if (button) {
            button.innerHTML = '⏳...';
            button.disabled = true;
        }
        
        let program = null;
        let actualProgramName = programName;
        
        // Cek dulu apakah currentPrograms adalah array dan ada datanya
        if (Array.isArray(currentPrograms) && currentPrograms.length > 0) {
            program = currentPrograms.find(p => p.id_program === programId);
        }
        
        // Jika tidak ditemukan di currentPrograms, load dari cache
        if (!program) {
            const programs = await CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROGRAMS,
                'getProgramAktif',
                {},
                CACHE_CONFIG.DURATIONS.DYNAMIC
            );
            
            // PASTIKAN programs adalah array sebelum menggunakan .find()
            const programsArray = Array.isArray(programs) ? programs : (programs?.data || []);
            program = programsArray.find(p => p.id_program === programId);
            
            // Update currentPrograms untuk penggunaan selanjutnya
            currentPrograms = programsArray;
        }
        
        if (!program) {
            throw new Error('Program tidak ditemukan');
        }
        
        // Jika programName tidak provided, gunakan nama dari program
        if (!actualProgramName || actualProgramName === 'undefined') {
            actualProgramName = program.nama_program || 'Program';
        }
        
        const brosurUrl = findBrosurUrlForProgram(program);
        
        if (brosurUrl) {
            const safeFileName = actualProgramName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            openDownloadLink(brosurUrl, `Brosur_${safeFileName}.pdf`);
        } else {
            handleNoBrosurAvailable(actualProgramName, 'program');
        }
        
    } catch (error) {
        console.error('Error downloading brochure:', error);
        showError('Gagal mengunduh brosur: ' + error.message);
    } finally {
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

async function downloadBrosurPromo(promoId, promoName) {
    const button = event?.target;
    const originalText = button?.innerHTML || '📥 Brosur';
    
    try {
        if (button) {
            button.innerHTML = '⏳...';
            button.disabled = true;
        }
        
        let promo = null;
        let actualPromoName = promoName;
        
        // Cek dulu apakah currentPromos adalah array dan ada datanya
        if (Array.isArray(currentPromos) && currentPromos.length > 0) {
            promo = currentPromos.find(p => p.id_promo === promoId);
        }
        
        // Jika tidak ditemukan di currentPromos, load dari cache
        if (!promo) {
            const promos = await CacheManager.loadWithCache(
                CACHE_CONFIG.KEYS.PROMOS,
                'getPromoAktif',
                {},
                CACHE_CONFIG.DURATIONS.SHORT
            );
            
            // PASTIKAN promos adalah array sebelum menggunakan .find()
            const promosArray = Array.isArray(promos) ? promos : (promos?.data || []);
            promo = promosArray.find(p => p.id_promo === promoId);
            
            // Update currentPromos untuk penggunaan selanjutnya
            currentPromos = promosArray;
        }
        
        if (!promo) {
            throw new Error('Promo tidak ditemukan');
        }
        
        // Jika promoName tidak provided, gunakan nama dari promo
        if (!actualPromoName || actualPromoName === 'undefined') {
            actualPromoName = promo.nama_promo || 'Promo';
        }
        
        const brosurUrl = findBrosurUrlForPromo(promo);
        
        if (brosurUrl) {
            const safeFileName = actualPromoName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            openDownloadLink(brosurUrl, `Brosur_Promo_${safeFileName}.pdf`);
        } else {
            handleNoBrosurAvailable(actualPromoName, 'promo');
        }
        
    } catch (error) {
        console.error('Error downloading promo brochure:', error);
        showError('Gagal mengunduh brosur: ' + error.message);
    } finally {
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

// Tambahkan function helper untuk handle download yang lebih aman
function downloadProgramBrosurSafe(programId, programElement) {
    const programName = programElement?.getAttribute('data-program-name') || 
                       programElement?.closest('.program-card')?.querySelector('.program-title')?.textContent || 
                       'Program';
    downloadBrosurProgram(programId, programName);
}

function downloadPromoBrosurSafe(promoId, promoElement) {
    const promoName = promoElement?.getAttribute('data-promo-name') || 
                     promoElement?.closest('.promo-card')?.querySelector('.promo-title')?.textContent || 
                     'Promo';
    downloadBrosurPromo(promoId, promoName);
}

function findBrosurUrlForProgram(program) {
    
    if (program.link_brosur && program.link_brosur.trim() !== '') {
        const url = processBrosurUrl(program.link_brosur.trim());
        if (url) {
            return url;
        }
    }
    
    if (program.brosur && program.brosur.trim() !== '') {
        const url = processBrosurUrl(program.brosur.trim());
        if (url) {
            return url;
        }
    }
    
    return null;
}

function findBrosurUrlForPromo(promo) {
    
    if (promo['promo.K'] && promo['promo.K'].trim() !== '') {
        const url = processBrosurUrl(promo['promo.K'].trim());
        if (url) {
            return url;
        }
    }
    
    if (promo.K && promo.K.trim() !== '') {
        const url = processBrosurUrl(promo.K.trim());
        if (url) {
            return url;
        }
    }
    
    if (promo.link_brosur && promo.link_brosur.trim() !== '') {
        const url = processBrosurUrl(promo.link_brosur.trim());
        if (url) {
            return url;
        }
    }
    
    return null;
}

function processBrosurUrl(url) {
    if (!url || url === '#' || url.trim() === '') return null;
    
    const trimmedUrl = url.trim();
    
    if (trimmedUrl.startsWith('http')) {
        return trimmedUrl;
    }
    
    if (trimmedUrl.length > 10 && !trimmedUrl.includes(' ') && /^[a-zA-Z0-9_-]+$/.test(trimmedUrl)) {
        const driveUrl = `https://drive.google.com/uc?export=download&id=${trimmedUrl}`;
        return driveUrl;
    }
    
    if ((trimmedUrl.includes('.') || trimmedUrl.includes('/')) && trimmedUrl.length > 5) {
        const fullUrl = trimmedUrl.startsWith('http') ? trimmedUrl : 'https://' + trimmedUrl;
        return fullUrl;
    }
    
    return null;
}

function handleNoBrosurAvailable(itemName, type = 'program') {
    const message = type === 'program' 
        ? `Brosur untuk "${itemName}" belum tersedia.\n\nApakah Anda ingin menghubungi admin untuk mendapatkan brosur?`
        : `Brosur untuk promo "${itemName}" belum tersedia.\n\nApakah Anda ingin menghubungi admin untuk mendapatkan brosur?`;
    
    const userChoice = confirm(message);
    
    if (userChoice) {
        const whatsappMessage = type === 'program'
            ? `Halo, saya ingin request brosur untuk program: ${itemName}`
            : `Halo, saya ingin request brosur untuk promo: ${itemName}`;
            
        const whatsappUrl = `https://wa.me/6285180649460?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
    }
}

function openDownloadLink(url, filename) {
    try {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        if (url.includes('drive.google.com/uc?export=download') || 
            url.includes('.pdf') || 
            url.includes('.doc') || 
            url.includes('.jpg') || 
            url.includes('.png')) {
            link.download = filename || 'brosur.pdf';
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        window.open(url, '_blank');
    }
}

function showLoading(container) {
    const isPrograms = container.id === 'programsContainer';
    const isTestimonials = container.id === 'testimonialsContainer';
    const isStats = container.id === 'statsContainer';
    
    if (isPrograms) {
        container.innerHTML = `
            <div class="skeleton-program-card skeleton-loading">
                <div class="skeleton-text" style="height: 1.5rem; width: 70%; margin-bottom: 1rem;"></div>
                <div class="skeleton-text short" style="margin-bottom: 1.5rem;"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-button"></div>
            </div>
            <div class="skeleton-program-card skeleton-loading">
                <div class="skeleton-text" style="height: 1.5rem; width: 70%; margin-bottom: 1rem;"></div>
                <div class="skeleton-text short" style="margin-bottom: 1.5rem;"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-button"></div>
            </div>
            <div class="skeleton-program-card skeleton-loading">
                <div class="skeleton-text" style="height: 1.5rem; width: 70%; margin-bottom: 1rem;"></div>
                <div class="skeleton-text short" style="margin-bottom: 1.5rem;"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-button"></div>
            </div>
        `;
    } else if (isTestimonials) {
        container.innerHTML = `
            <div class="skeleton-testimonial-card skeleton-loading">
                <div class="skeleton-text" style="margin-bottom: 1rem;"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text medium" style="margin-bottom: 2rem;"></div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="skeleton-loading" style="width: 50px; height: 50px; border-radius: 50%;"></div>
                    <div style="flex: 1;">
                        <div class="skeleton-text short" style="margin-bottom: 0.5rem;"></div>
                        <div class="skeleton-text" style="width: 40%;"></div>
                    </div>
                </div>
            </div>
        `;
    } else if (isStats) {
        container.innerHTML = `
            <div class="stat-card skeleton-loading" style="min-height: 120px;"></div>
            <div class="stat-card skeleton-loading" style="min-height: 120px;"></div>
            <div class="stat-card skeleton-loading" style="min-height: 120px;"></div>
            <div class="stat-card skeleton-loading" style="min-height: 120px;"></div>
        `;
    } else {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Memuat data...</p>
            </div>
        `;
    }
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

function setupClassOptions() {
    const jenjangSelects = document.querySelectorAll('select[name="jenjang"]');
    const kelasSelects = document.querySelectorAll('select[name="kelas"]');
    
    jenjangSelects.forEach((jenjangSelect, index) => {
        const kelasSelect = kelasSelects[index];
        
        if (jenjangSelect && kelasSelect) {
            updateClassOptions(jenjangSelect, kelasSelect);
            
            jenjangSelect.addEventListener('change', function() {
                updateClassOptions(this, kelasSelect);
            });
        }
    });
}

function updateClassOptions(jenjangSelect, kelasSelect) {
    const jenjang = jenjangSelect.value;
    let classes = [];
    
    switch(jenjang) {
        case 'SD':
            classes = ['1', '2', '3', '4', '5', '6'];
            break;
        case 'SMP':
            classes = ['7', '8', '9'];
            break;
        case 'SMA':
            classes = ['10', '11', '12'];
            break;
        default:
            classes = [];
    }
    
    kelasSelect.innerHTML = '<option value="">Pilih Kelas</option>' +
        classes.map(cls => `<option value="${cls}">Kelas ${cls}</option>`).join('');
}

function validateGoogleDriveLink(input, fileType) {
    const statusElement = document.getElementById(`${fileType}_status`);
    const url = input.value.trim();
    
    if (!url) {
        if (statusElement) {
            statusElement.innerHTML = '';
            statusElement.className = '';
        }
        input.style.borderColor = '';
        return true;
    }
    
    if (isValidGoogleDriveLink(url)) {
        if (statusElement) {
            statusElement.innerHTML = '✅ Link Google Drive valid';
            statusElement.className = 'link-valid';
        }
        input.style.borderColor = 'var(--primary-teal)';
        return true;
    } else {
        if (statusElement) {
            statusElement.innerHTML = '❌ Format link tidak valid. Pastikan link dari Google Drive';
            statusElement.className = 'link-invalid';
        }
        input.style.borderColor = '#dc2626';
        return false;
    }
}

function isValidGoogleDriveLink(url) {
    if (!url || typeof url !== 'string') return false;
    
    const drivePatterns = [
        /drive\.google\.com\/file\/d\//,
        /drive\.google\.com\/uc\?id=/,
        /docs\.google\.com\/.*\/d\//,
        /drive\.google\.com\/open\?id=/
    ];
    
    return drivePatterns.some(pattern => pattern.test(url));
}

function resetLinkStatus() {
    ['foto', 'cv', 'kerja'].forEach(type => {
        const statusElement = document.getElementById(`${type}_status`);
        const inputElement = document.getElementById(`${type}_url`);
        if (statusElement) {
            statusElement.innerHTML = '';
            statusElement.className = '';
        }
        if (inputElement) inputElement.style.borderColor = '';
    });
}

function setupTutorEmailDetection() {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;
    
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && isValidEmail(email)) {
            checkExistingTutor(email);
        }
    });
}

async function checkExistingTutor(email) {
    try {
        const response = await callGoogleScript('findTutorByEmail', { email: email });
        
        if (response.success && response.tutor) {
            showExistingTutorUI(response.tutor);
        } else {
            hideExistingTutorUI();
        }
    } catch (error) {
        hideExistingTutorUI();
    }
}

function showExistingTutorUI(tutorData) {
    
    const messageDiv = document.getElementById('existingTutorMessage');
    messageDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #e8f5e8, #c8e6c9); padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; border-left: 4px solid #4caf50;">
            <h3 style="color: #2e7d32; margin-bottom: 1rem;">🎉 Welcome Back, ${tutorData.nama_lengkap}!</h3>
            <p style="color: #1b5e20; margin-bottom: 1rem;">
                Kami menemukan data Anda dalam sistem. Untuk lamaran ini:
            </p>
            <ul style="color: #1b5e20; margin-bottom: 1rem;">
                <li>✅ <strong>Dokumen menggunakan yang sudah ada</strong> (tidak perlu upload ulang)</li>
                <li>📝 Isi field dokumen hanya jika ingin update</li>
                <li>🔄 Data pribadi akan diperbarui otomatis</li>
            </ul>
            <small style="color: #388e3c;">Email terdaftar: ${tutorData.email}</small>
        </div>
    `;
    messageDiv.style.display = 'block';
    
    document.getElementById('documentsNotice').style.display = 'block';
    autoFillTutorData(tutorData);
}

function hideExistingTutorUI() {
    document.getElementById('existingTutorMessage').style.display = 'none';
    document.getElementById('documentsNotice').style.display = 'none';
}

function autoFillTutorData(tutorData) {
    const fieldsToAutoFill = {
        'nama_lengkap': tutorData.nama_lengkap,
        'jenis_kelamin': tutorData.jenis_kelamin,
        'alamat_domisili': tutorData.alamat_domisili,
        'pendidikan_terakhir': tutorData.pendidikan_terakhir,
        'instansi_pendidikan': tutorData.instansi_pendidikan,
        'jurusan': tutorData.jurusan
    };
    
    for (const [fieldId, value] of Object.entries(fieldsToAutoFill)) {
        const element = document.getElementById(fieldId);
        if (element && !element.value) {
            element.value = value || '';
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setupTutorFormSubmission() {
    const form = document.getElementById('tutorRegistrationForm');
    if (!form) {
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleTutorFormSubmission(this);
    });
}

async function handleTutorFormSubmission(form) {
    if (form.isSubmitting) {
        return;
    }
    
    form.isSubmitting = true;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const progressDiv = document.getElementById('uploadProgress');
    const originalText = submitBtn.innerHTML;
    
    try {
        if (progressDiv) progressDiv.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Mengirim...';
        
        if (!await validateTutorForm(form)) {
            throw new Error('Validasi form gagal');
        }
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        const jenjangCheckboxes = form.querySelectorAll('input[name="jenjang_diajarkan"]:checked');
        data.jenjang_diajarkan = Array.from(jenjangCheckboxes).map(cb => cb.value).join(', ');
        
        const selectedKarirId = localStorage.getItem('selectedKarirId');
        if (selectedKarirId) {
            data.karir_id = selectedKarirId;
        }
        
        const response = await callGoogleScript('submitTutorRegistrationWithLinks', data);
        
        if (response.success) {
            let successMessage = response.message || 'Lamaran berhasil dikirim! Kami akan menghubungi Anda dalam 1x24 jam.';
            
            if (response.isExistingTutor) {
                showSuccess('🔄 ' + successMessage);
            } else {
                showSuccess('🎉 ' + successMessage);
            }
            
            form.reset();
            localStorage.removeItem('selectedKarirId');
            localStorage.removeItem('selectedKarirName');
            resetLinkStatus();
            hideExistingTutorUI();
            
            setTimeout(() => {
                window.location.href = 'karir.html';
            }, 3000);
            
        } else {
            throw new Error(response.message);
        }
        
    } catch (error) {
        showError('Gagal mengirim lamaran: ' + error.message);
    } finally {
        form.isSubmitting = false;
        
        if (progressDiv) progressDiv.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function validateTutorForm(form) {
    const requiredFields = [
        'nama_lengkap', 'jenis_kelamin', 'tanggal_lahir', 'alamat_domisili',
        'no_hp', 'email', 'pendidikan_terakhir', 'instansi_pendidikan',
        'jurusan', 'ipk', 'status_sekarang', 'pengalaman_mengajar',
        'kesediaan_mengajar', 'area_mengajar'
    ];
    
    for (let field of requiredFields) {
        const element = document.getElementById(field);
        if (!element || !element.value || !element.value.toString().trim()) {
            showError(`Field ${field.replace('_', ' ')} harus diisi!`);
            element?.focus();
            return false;
        }
    }
    
    const jenjangCheckboxes = document.querySelectorAll('input[name="jenjang_diajarkan"]:checked');
    if (jenjangCheckboxes.length === 0) {
        showError('Pilih minimal satu jenjang yang bisa diajarkan!');
        return false;
    }
    
    const pernyataan = document.querySelector('input[name="pernyataan_kebenaran"]');
    if (!pernyataan || !pernyataan.checked) {
        showError('Anda harus menyetujui pernyataan kebenaran data!');
        return false;
    }
    
    const fotoUrl = document.getElementById('foto_url')?.value;
    const cvUrl = document.getElementById('cv_url')?.value;
    const kerjaUrl = document.getElementById('kesepakatan_kerja_url')?.value;
    
    if (fotoUrl && !isValidGoogleDriveLink(fotoUrl)) {
        showError('Link foto tidak valid!');
        return false;
    }
    if (cvUrl && !isValidGoogleDriveLink(cvUrl)) {
        showError('Link CV tidak valid!');
        return false;
    }
    if (kerjaUrl && !isValidGoogleDriveLink(kerjaUrl)) {
        showError('Link kesepakatan kerja tidak valid!');
        return false;
    }
    
    return true;
}

function initializeTutorForm() {
    const form = document.getElementById('tutorRegistrationForm');
    if (form) {
        setupTutorFormSubmission();
        setupTutorEmailDetection();
    } else {
    }
    
    autoSelectKarirInForm();
}

function handleSimpleJamSelection(selectElement, formType) {
    const selectedValue = selectElement.value;
    const catatanContainer = document.getElementById(`${formType}_jam_catatan_container`);
    const hiddenInput = document.getElementById(`${formType}_jadwal_jam`);
    const catatanInput = document.getElementById(`${formType}_jam_catatan`);
    
    if (selectedValue === 'other') {
        catatanContainer.style.display = 'block';
        // Reset value dulu
        hiddenInput.value = '';
        catatanInput.required = true;
    } else if (selectedValue) {
        catatanContainer.style.display = 'none';
        hiddenInput.value = selectedValue;
        catatanInput.required = false;
        catatanInput.value = ''; // Clear catatan
    } else {
        catatanContainer.style.display = 'none';
        hiddenInput.value = '';
        catatanInput.required = false;
        catatanInput.value = ''; // Clear catatan
    }
}

// Function baru untuk update custom jam
function updateCustomJam(formType) {
    const catatanInput = document.getElementById(`${formType}_jam_catatan`);
    const hiddenInput = document.getElementById(`${formType}_jadwal_jam`);
    
    if (catatanInput.value.trim() !== '') {
        hiddenInput.value = `Custom: ${catatanInput.value.trim()}`;
    } else {
        hiddenInput.value = '';
    }
}
// Tambahkan performance monitoring
const PerformanceTracker = {
    startTimes: new Map(),
    
    start(name) {
        this.startTimes.set(name, performance.now());
    },
    
    end(name) {
        const start = this.startTimes.get(name);
        if (start) {
            const duration = performance.now() - start;
            this.startTimes.delete(name);
        }
    }
};

// Usage:
PerformanceTracker.start('homepage_loading');
// ... setelah loading selesai
PerformanceTracker.end('homepage_loading');

// Cache monitoring disabled in production



window.CacheManager = CacheManager;
window.ProgressManager = ProgressManager;




