// Scroll reveal
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);} });
},{threshold:0.1});
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>io.observe(el));

// Staggered reveal for skill cards
const skillIo = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(!entry.isIntersecting) return;
    const cards = entry.target.querySelectorAll('.skill-icon-item');
    cards.forEach((card, idx) => {
      setTimeout(() => card.classList.add('visible'), idx * 60);
    });
    skillIo.unobserve(entry.target);
  });
},{threshold:0.2});
document.querySelectorAll('.skill-icons-row').forEach(row=>skillIo.observe(row));

async function fetchRandomQuote(){
  try {
    const res = await fetch('/api/quote');
    if(res.ok){
      const data = await res.json();
      if(data && typeof data.quote === 'string' && data.quote.trim()) return data;
    }
  } catch (e) {}

  try {
    const res = await fetch('https://dummyjson.com/quotes/random');
    if(res.ok){
      const data = await res.json();
      if(data && data.quote){
        return {
          quote: data.quote,
          person: data.author || 'Unknown',
          domain: 'General inspiration'
        };
      }
    }
  } catch (e) {}
  return null;
}

async function generateQuote(){
  const btn = document.getElementById('quoteBtn');
  const icon = document.getElementById('quoteIcon');
  const box = document.getElementById('quoteBox');
  const textEl = document.getElementById('quoteText');
  const attrEl = document.getElementById('quoteAttr');
  const bdayEl = document.getElementById('quoteBirthday');
  const ctxEl = document.getElementById('quoteContext');
  const portraitEl = document.getElementById('quotePortrait');

  btn.classList.add('loading');
  icon.textContent = '⟳';
  btn.disabled = true;
  box.classList.remove('visible');

  try {
    const payload = await fetchRandomQuote();
    if(!payload) throw new Error('No quote payload');

    textEl.textContent = `"${payload.quote}"`;
    attrEl.textContent = payload.person ? `— ${payload.person}` : '— Notable thinker';
    bdayEl.textContent = payload.domain ? `Domain: ${payload.domain}` : 'Domain: Tech / Astronomy / Philosophy';
    ctxEl.textContent = 'Click again for another quote.';
    portraitEl.removeAttribute('src');
    portraitEl.style.display = 'none';

    box.classList.add('visible');
    box.style.animation = 'none';
    box.offsetHeight;
    box.style.animation = 'fadeIn 0.5s ease forwards';
  } catch(e) {
    textEl.textContent = '"A model that works only in notebooks is still in training for reality."';
    attrEl.textContent = '— Fallback quote';
    bdayEl.textContent = 'Domain: Tech / Astronomy / Philosophy';
    ctxEl.textContent = 'Quote service unavailable. If running locally, start `node server.js` then refresh.';
    portraitEl.removeAttribute('src');
    portraitEl.style.display = 'none';
    box.classList.add('visible');
  }

  btn.classList.remove('loading');
  icon.textContent = '✦';
  btn.disabled = false;
}