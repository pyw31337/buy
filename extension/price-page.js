// 렛츠바이가 연 가격 확인 탭(주소에 lb=1)에서만: 검색 결과 HTML을 확장에 넘김
if (/[?&]lb=1/.test(location.search)) setTimeout(() => chrome.runtime.sendMessage({ type: 'searchHtml', html: document.documentElement.outerHTML.slice(0, 3e6) }), 3500);
