<template>
  <svg class="menu-scene-art" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A radiant eclipse hangs over an ancient ruined battlefield">
    <defs>
      <linearGradient id="menuSky" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#142c3b"/><stop offset=".5" stop-color="#102331"/><stop offset="1" stop-color="#090f1c"/></linearGradient>
      <radialGradient id="menuCorona"><stop stop-color="#fff3c4" stop-opacity=".85"/><stop offset=".2" stop-color="#edbe7a" stop-opacity=".5"/><stop offset=".51" stop-color="#9b9ed3" stop-opacity=".16"/><stop offset="1" stop-color="#6d8da6" stop-opacity="0"/></radialGradient>
      <linearGradient id="menuHaze" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bfac88" stop-opacity="0"/><stop offset=".63" stop-color="#7b8696" stop-opacity=".2"/><stop offset="1" stop-color="#243b3a" stop-opacity=".6"/></linearGradient>
      <linearGradient id="menuStone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#526777"/><stop offset=".48" stop-color="#2a3e4e"/><stop offset="1" stop-color="#12212c"/></linearGradient>
      <linearGradient id="menuGround" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#34474a"/><stop offset="1" stop-color="#111f28"/></linearGradient>
      <filter id="menuMoonGlow"><feGaussianBlur stdDeviation="18"/></filter>
      <filter id="menuMist"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="1200" height="800" fill="url(#menuSky)"/>
    <path d="M0 0H1200V320Q1040 235 865 305T490 270T0 310Z" fill="#50606f" opacity=".10"/>
    <g fill="#f0dec1">
      <circle cx="78" cy="87" r="2" opacity=".7"/><circle cx="173" cy="162" r="1.3" opacity=".6"/><circle cx="281" cy="62" r="2" opacity=".6"/><circle cx="365" cy="180" r="1.5"/><circle cx="515" cy="89" r="2" opacity=".5"/><circle cx="601" cy="139" r="1.5"/><circle cx="740" cy="56" r="1.4"/><circle cx="830" cy="167" r="2"/><circle cx="950" cy="78" r="1.8"/><circle cx="1090" cy="185" r="1.8"/>
      <circle cx="62" cy="307" r="1.3"/><circle cx="254" cy="268" r="1"/><circle cx="703" cy="257" r="1.5"/><circle cx="1030" cy="282" r="1"/>
    </g>
    <circle cx="512" cy="206" r="265" fill="url(#menuCorona)" opacity=".8"/>
    <circle cx="512" cy="206" r="105" fill="#eabf83" opacity=".2" filter="url(#menuMoonGlow)"/>
    <circle cx="512" cy="206" r="81" fill="#f3d8a5"/>
    <circle cx="508" cy="199" r="76" fill="#152433"/>
    <circle cx="512" cy="206" r="88" fill="none" stroke="#f3d8ae" stroke-opacity=".46" stroke-width="2"/>
    <circle cx="512" cy="206" r="112" fill="none" stroke="#dfc497" stroke-opacity=".12" stroke-width="1"/>
    <path d="M0 427L85 375 148 410 246 312 354 423 445 355 544 418 650 300 757 412 846 355 949 406 1056 319 1200 418V800H0Z" fill="#1b3440"/>
    <path d="M0 485L91 435 177 473 296 390 395 465 504 415 608 483 732 389 860 469 955 398 1091 456 1200 396V800H0Z" fill="#152b35"/>
    <path d="M0 460Q330 396 655 474T1200 434V800H0Z" fill="url(#menuHaze)"/>
    <g fill="url(#menuStone)" stroke="#77818b" stroke-opacity=".28" stroke-width="3">
      <path d="M110 572V381H133V347H143V331H154V347H169V381H190V572Z"/>
      <path d="M161 394V365L194 346 224 365V393H234V574H161Z"/>
      <path d="M890 577V312H920V275L936 261 950 275V312H972V577Z"/>
      <path d="M1008 577V360H1030V322H1042V303H1054V322H1073V360H1095V577Z"/>
      <path d="M1075 566V400H1126V362H1145V390H1168V566Z"/>
    </g>
    <g fill="#13242e">
      <path d="M191 560V417L208 399 224 417V560Z"/><path d="M918 564V368L930 349 947 369V564Z"/>
      <path d="M1033 568V420L1049 396 1066 420V568Z"/>
    </g>
    <g stroke="#65757b" stroke-opacity=".46" stroke-width="4" fill="none">
      <path d="M115 398H181M115 428H181M117 465H181M894 329H967M895 397H967M1014 375H1090M1014 460H1090"/>
      <path d="M122 420L153 452 133 503M916 344L933 390 917 427M1061 379L1038 430 1058 486"/>
    </g>
    <path d="M0 555Q90 518 182 541T400 543Q530 510 676 541T914 539T1200 515V800H0Z" fill="#1c3439"/>
    <ellipse cx="515" cy="581" rx="530" ry="45" fill="#afc5bb" opacity=".14" filter="url(#menuMist)"/>
    <path d="M0 674Q210 597 420 656Q655 724 825 627T1200 633V800H0Z" fill="url(#menuGround)"/>
    <path d="M460 800Q505 724 524 657L566 599 595 595 610 655 664 800Z" fill="#8b8a79" opacity=".16"/>
    <path d="M0 761L133 712 203 758 320 679 395 743 454 727 486 800H0ZM833 800L881 716 985 739 1080 682 1200 720V800Z" fill="#101e25"/>
    <g fill="#cbd9b5" opacity=".5"><circle cx="192" cy="522" r="3"/><circle cx="311" cy="570" r="2"/><circle cx="698" cy="515" r="3"/><circle cx="803" cy="570" r="2.5"/><circle cx="1030" cy="553" r="2"/></g>
    <g stroke="#b5be86" stroke-opacity=".3" stroke-width="3" fill="none"><path d="M70 798q8-62 34-98m-12 87q-6-20-28-27M188 800q7-54 27-83m-9 61q20-25 41-24M990 800q8-62 23-89m-17 64q-17-23-30-20M1148 800q0-56 24-92"/></g>
    <g fill="#eac98d"><circle cx="330" cy="470" r="2.5"/><circle cx="731" cy="491" r="2"/><circle cx="824" cy="325" r="2.5"/><circle cx="249" cy="650" r="2"/><circle cx="867" cy="619" r="2"/></g>
  </svg>
</template>
