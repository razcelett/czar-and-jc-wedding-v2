export default function DiverLine() {
  return (
    <>
      <div id="line" aria-hidden="false">
        <div className="rope"></div>
        <div className="fill" id="fill"></div>
        <div id="diver" aria-hidden="true">
          <div className="body">
            <svg viewBox="0 0 100 262" fill="none">
              <defs><linearGradient id="finG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FFFFFF" /><stop offset="55%" stopColor="#F1F5F6" /><stop offset="100%" stopColor="#CFE0E3" /></linearGradient></defs>
              <g id="legL">
                <path d="M44,118 C39,138 35,158 39,175 C40,180 42,183 45,184 C47,183 48,180 48,176 C48,157 46,138 45,120 Z" fill="#041420" />
                <g id="finL"><path d="M39,175 C24,189 12,210 10,236 C9,246 13,252 19,252 C26,250 33,232 36,208 C37,196 37,184 38,177 C38,176 39,175 39,175 Z" fill="url(#finG)" /><path d="M39,175 C27,189 16,208 12,230" stroke="#B9CDD1" strokeWidth="1.3" opacity=".7" /></g>
              </g>
              <g id="legR">
                <path d="M48,118 C53,138 57,158 53,175 C52,180 50,183 47,184 C45,183 44,180 44,176 C44,157 46,138 47,120 Z" fill="#041420" />
                <g id="finR"><path d="M53,175 C68,189 80,210 82,236 C83,246 79,252 73,252 C66,250 59,232 56,208 C55,196 55,184 54,177 C54,176 53,175 53,175 Z" fill="url(#finG)" /><path d="M53,175 C65,189 76,208 80,230" stroke="#B9CDD1" strokeWidth="1.3" opacity=".7" /></g>
              </g>
              <circle cx="45" cy="34" r="11" fill="#041420" />
              <path d="M37,44 C32,64 31,87 35,106 C37,115 41,120 46,121 C51,120 55,115 57,106 C61,87 60,64 55,44 C52,41 43,40 41,42 C39,43 38,44 37,44 Z" fill="#0A2E3D" />
              <path d="M35,48 C29,53 26,61 26,71 C26,75 28,78 31,78 C30,84 29,90 30,95 C31,98 34,99 36,97 C37,95 37,92 36,89 C35,84 34,79 35,79 C33,75 31,69 32,63 C33,58 34,53 35,48 Z" fill="#0A2E3D" opacity=".95" />
              <path d="M57,48 C63,53 66,61 66,71 C66,75 64,78 61,78 C62,84 63,90 62,95 C61,98 58,99 56,97 C55,95 55,92 56,89 C57,84 58,79 57,79 C59,75 61,69 60,63 C59,58 58,53 57,48 Z" fill="#0A2E3D" opacity=".95" />
            </svg>
          </div>
          <span id="depth-tag"><b>0 m</b><span> · Welcome</span></span>
        </div>
      </div>
    </>
  );
}
