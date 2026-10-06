/* Rubato screen saver host for Windows.
   The exported page is appended to this executable:
   [name utf8][html utf8][footer: "RBTOSCR1" u32 nameLen u32 htmlLen u32 bgRGB u32 0]
   /s  : run full screen (page shown by Microsoft Edge in kiosk mode, other displays covered)
   /p h: preview inside the Screen Saver Settings window
   /c  : about box                                                    Ensemble · 2026 */
#define WIN32_LEAN_AND_MEAN
#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shlobj.h>
#include <stdint.h>

typedef struct { char *name; uint32_t nameLen; char *html; uint32_t htmlLen; uint32_t bg; } Payload;
static Payload P; static wchar_t gName[256]=L"Rubato";
static COLORREF gBg=RGB(0,0,0); static HBRUSH gBrush;

static int readPayload(void){
  wchar_t path[MAX_PATH*2]; DWORD n=GetModuleFileNameW(NULL,path,MAX_PATH*2); if(!n) return 0;
  HANDLE f=CreateFileW(path,GENERIC_READ,FILE_SHARE_READ,NULL,OPEN_EXISTING,0,NULL); if(f==INVALID_HANDLE_VALUE) return 0;
  LARGE_INTEGER sz; GetFileSizeEx(f,&sz); int ok=0;
  if(sz.QuadPart>24){
    unsigned char ft[24]; LARGE_INTEGER pos; pos.QuadPart=sz.QuadPart-24; DWORD rd;
    SetFilePointerEx(f,pos,NULL,FILE_BEGIN);
    if(ReadFile(f,ft,24,&rd,NULL)&&rd==24&&memcmp(ft,"RBTOSCR1",8)==0){
      uint32_t nl,hl,bg; memcpy(&nl,ft+8,4); memcpy(&hl,ft+12,4); memcpy(&bg,ft+16,4);
      if((LONGLONG)nl+hl+24<=sz.QuadPart){
        pos.QuadPart=sz.QuadPart-24-hl-nl; SetFilePointerEx(f,pos,NULL,FILE_BEGIN);
        P.name=HeapAlloc(GetProcessHeap(),0,nl+1); P.html=HeapAlloc(GetProcessHeap(),0,hl+1);
        if(P.name&&P.html&&ReadFile(f,P.name,nl,&rd,NULL)&&rd==nl&&ReadFile(f,P.html,hl,&rd,NULL)&&rd==hl){
          P.name[nl]=0;P.html[hl]=0;P.nameLen=nl;P.htmlLen=hl;P.bg=bg;ok=1;
          MultiByteToWideChar(CP_UTF8,0,P.name,-1,gName,255);
          gBg=RGB((bg>>16)&255,(bg>>8)&255,bg&255);
        }
      }
    }
  }
  CloseHandle(f); return ok;
}

/* ---------- small helpers ---------- */
static void safeName(wchar_t *out,int cap){int j=0;for(int i=0;gName[i]&&j<cap-1;i++){wchar_t c=gName[i];
  if((c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c==' '||c=='-'||c=='_')out[j++]=c;}if(!j)out[j++]=L'R';out[j]=0;}
static int writeFileW(const wchar_t *p,const char *d,DWORD n){HANDLE f=CreateFileW(p,GENERIC_WRITE,0,NULL,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);
  if(f==INVALID_HANDLE_VALUE)return 0;DWORD w;BOOL ok=WriteFile(f,d,n,&w,NULL)&&w==n;CloseHandle(f);return ok;}
/* path -> file:/// URL, UTF-8 percent-encoded */
static void fileUrl(const wchar_t *path,wchar_t *out,int cap){
  char u8[4096];int n=WideCharToMultiByte(CP_UTF8,0,path,-1,u8,sizeof u8,NULL,NULL);if(n<=0){out[0]=0;return;}
  const char *hex="0123456789ABCDEF";int j=0;const wchar_t *pre=L"file:///";for(int i=0;pre[i];i++)out[j++]=pre[i];
  for(int i=0;u8[i]&&j<cap-4;i++){unsigned char c=(unsigned char)u8[i];if(c=='\\')c='/';
    if((c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'||c=='.'||c=='_'||c=='~'||c=='/'||c==':')out[j++]=c;
    else{out[j++]='%';out[j++]=hex[c>>4];out[j++]=hex[c&15];}}
  out[j]=0;}
static int fileExists(const wchar_t *p){DWORD a=GetFileAttributesW(p);return a!=INVALID_FILE_ATTRIBUTES&&!(a&FILE_ATTRIBUTE_DIRECTORY);}
static int findEdge(wchar_t *out,DWORD cap){
  const wchar_t *key=L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe";HKEY roots[2]={HKEY_LOCAL_MACHINE,HKEY_CURRENT_USER};
  for(int r=0;r<2;r++){DWORD sz=cap*sizeof(wchar_t);if(RegGetValueW(roots[r],key,NULL,RRF_RT_REG_SZ,NULL,out,&sz)==ERROR_SUCCESS&&fileExists(out))return 1;}
  const wchar_t *envs[2]={L"ProgramFiles(x86)",L"ProgramFiles"};
  for(int i=0;i<2;i++){wchar_t base[MAX_PATH];if(GetEnvironmentVariableW(envs[i],base,MAX_PATH)){wsprintfW(out,L"%s\\Microsoft\\Edge\\Application\\msedge.exe",base);if(fileExists(out))return 1;}}
  return 0;}

/* ---------- cover window: background colour over every display, hidden cursor ---------- */
static LRESULT CALLBACK coverProc(HWND h,UINT m,WPARAM w,LPARAM l){
  switch(m){
    case WM_SETCURSOR: SetCursor(NULL); return TRUE;
    case WM_ERASEBKGND:{RECT r;GetClientRect(h,&r);FillRect((HDC)w,&r,gBrush);return 1;}
    case WM_CLOSE: DestroyWindow(h); return 0;
    case WM_DESTROY: PostQuitMessage(0); return 0;
  }
  return DefWindowProcW(h,m,w,l);}

static int runSaver(void){
  wchar_t local[MAX_PATH],dir[MAX_PATH],prof[MAX_PATH],page[MAX_PATH],nm[128],edge[MAX_PATH],url[4096];
  safeName(nm,128);
  if(!GetEnvironmentVariableW(L"LOCALAPPDATA",local,MAX_PATH))GetTempPathW(MAX_PATH,local);
  wsprintfW(dir,L"%s\\Rubato Screen Savers",local);CreateDirectoryW(dir,NULL);
  wsprintfW(dir,L"%s\\Rubato Screen Savers\\%s",local,nm);CreateDirectoryW(dir,NULL);
  wsprintfW(prof,L"%s\\browser",dir);wsprintfW(page,L"%s\\index.html",dir);
  int havePage=P.html&&writeFileW(page,P.html,P.htmlLen);

  WNDCLASSW wc={0};wc.lpfnWndProc=coverProc;wc.hInstance=GetModuleHandleW(NULL);wc.lpszClassName=L"RubatoCover";wc.hbrBackground=gBrush;RegisterClassW(&wc);
  int vx=GetSystemMetrics(SM_XVIRTUALSCREEN),vy=GetSystemMetrics(SM_YVIRTUALSCREEN),vw=GetSystemMetrics(SM_CXVIRTUALSCREEN),vh=GetSystemMetrics(SM_CYVIRTUALSCREEN);
  HWND cover=CreateWindowExW(WS_EX_TOOLWINDOW,L"RubatoCover",gName,WS_POPUP|WS_VISIBLE,vx,vy,vw,vh,NULL,NULL,wc.hInstance,NULL);
  ShowCursor(FALSE);UpdateWindow(cover);

  HANDLE job=NULL;PROCESS_INFORMATION pi={0};
  if(havePage&&findEdge(edge,MAX_PATH)){
    fileUrl(page,url,4096);
    static wchar_t cmd[8192];
    wsprintfW(cmd,L"\"%s\" --kiosk \"%s\" --edge-kiosk-type=fullscreen --user-data-dir=\"%s\" --no-first-run --no-default-browser-check "
                  L"--hide-crash-restore-bubble --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required --disable-pinch --overscroll-history-navigation=0",edge,url,prof);
    job=CreateJobObjectW(NULL,NULL);
    if(job){JOBOBJECT_EXTENDED_LIMIT_INFORMATION li={0};li.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE|JOB_OBJECT_LIMIT_BREAKAWAY_OK;
      SetInformationJobObject(job,JobObjectExtendedLimitInformation,&li,sizeof li);}
    STARTUPINFOW si={0};si.cb=sizeof si;
    AllowSetForegroundWindow(ASFW_ANY);
    if(CreateProcessW(edge,cmd,NULL,NULL,FALSE,CREATE_SUSPENDED,NULL,NULL,&si,&pi)){
      if(job)AssignProcessToJobObject(job,pi.hProcess);ResumeThread(pi.hThread);CloseHandle(pi.hThread);
    }
  }

  /* exit on real input, ignoring tiny mouse jitter, after a short grace period */
  LASTINPUTINFO li={sizeof li};GetLastInputInfo(&li);DWORD base=li.dwTime,start=GetTickCount();POINT p0;GetCursorPos(&p0);
  MSG msg;int quit=0;
  while(!quit){
    DWORD r=MsgWaitForMultipleObjects(0,NULL,FALSE,80,QS_ALLINPUT);(void)r;
    while(PeekMessageW(&msg,NULL,0,0,PM_REMOVE)){if(msg.message==WM_QUIT){quit=1;break;}
      if(msg.message==WM_KEYDOWN||msg.message==WM_SYSKEYDOWN||msg.message==WM_LBUTTONDOWN||msg.message==WM_RBUTTONDOWN||msg.message==WM_MBUTTONDOWN||msg.message==WM_MOUSEWHEEL)quit=1;
      TranslateMessage(&msg);DispatchMessageW(&msg);}
    if(quit)break;
    LASTINPUTINFO now={sizeof now};GetLastInputInfo(&now);
    if(now.dwTime!=base){POINT p;GetCursorPos(&p);int dx=p.x-p0.x,dy=p.y-p0.y;
      if(GetTickCount()-start<1500||(dx*dx+dy*dy<=100&&(dx||dy))){base=now.dwTime;p0=p;}
      else quit=1;}
  }
  if(job)TerminateJobObject(job,0);else if(pi.hProcess)TerminateProcess(pi.hProcess,0);
  if(pi.hProcess)CloseHandle(pi.hProcess);if(job)CloseHandle(job);
  ShowCursor(TRUE);if(IsWindow(cover))DestroyWindow(cover);
  return 0;}

/* ---------- preview inside Screen Saver Settings ---------- */
static LRESULT CALLBACK prevProc(HWND h,UINT m,WPARAM w,LPARAM l){
  switch(m){
    case WM_PAINT:{PAINTSTRUCT ps;HDC dc=BeginPaint(h,&ps);RECT r;GetClientRect(h,&r);FillRect(dc,&r,gBrush);
      int lum=(GetRValue(gBg)*299+GetGValue(gBg)*587+GetBValue(gBg)*114)/1000;SetTextColor(dc,lum>140?RGB(0,0,0):RGB(255,255,255));SetBkMode(dc,TRANSPARENT);
      DrawTextW(dc,gName,-1,&r,DT_CENTER|DT_VCENTER|DT_SINGLELINE|DT_END_ELLIPSIS);EndPaint(h,&ps);return 0;}
    case WM_DESTROY: PostQuitMessage(0); return 0;
  }
  return DefWindowProcW(h,m,w,l);}
static int runPreview(HWND parent){
  if(!IsWindow(parent))return 0;RECT r;GetClientRect(parent,&r);
  WNDCLASSW wc={0};wc.lpfnWndProc=prevProc;wc.hInstance=GetModuleHandleW(NULL);wc.lpszClassName=L"RubatoPreview";wc.hbrBackground=gBrush;RegisterClassW(&wc);
  HWND h=CreateWindowExW(0,L"RubatoPreview",L"",WS_CHILD|WS_VISIBLE,0,0,r.right,r.bottom,parent,NULL,wc.hInstance,NULL);if(!h)return 0;
  MSG m;while(GetMessageW(&m,NULL,0,0)>0){TranslateMessage(&m);DispatchMessageW(&m);}return 0;}

static int runConfig(HWND owner){
  wchar_t t[600];wsprintfW(t,L"%s screen saver\n\nMade with Rubato by Ensemble. It shows full screen using Microsoft Edge, which is built into Windows.\n\nTo change how it looks, export a new one from Rubato.",gName);
  MessageBoxW(owner,t,gName,MB_OK|MB_ICONINFORMATION);return 0;}

int WINAPI WinMain(HINSTANCE hi,HINSTANCE hp,LPSTR cl,int show){
  (void)hi;(void)hp;(void)cl;(void)show;
  readPayload();gBrush=CreateSolidBrush(gBg);
  /* arguments: /s, /p <hwnd>, /c[:hwnd] – any case, '/' or '-' */
  wchar_t *c=GetCommandLineW();
  if(*c==L'"'){c++;while(*c&&*c!=L'"')c++;if(*c)c++;}else{while(*c&&*c!=L' ')c++;}
  while(*c==L' ')c++;
  wchar_t mode=L'c';HWND h=NULL;
  if(*c==L'/'||*c==L'-'){mode=(wchar_t)(c[1]|0x20);c+=2;while(*c==L' '||*c==L':')c++;if(*c)h=(HWND)(INT_PTR)_wtoi64(c);}
  else if(!*c) mode=L'c';
  if(mode==L's')return runSaver();
  if(mode==L'p'&&h)return runPreview(h);
  return runConfig(h?h:NULL);
}
