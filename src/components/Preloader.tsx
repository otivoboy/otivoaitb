import React from 'react';

export default function Preloader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <style>{`
        .loader-container {
            display: flex;
            margin: 0.25em 0;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .loader-absolute {
            position: absolute;
        }

        .loader-inline-block {
            display: inline-block;
        }

        .loader-dash {
            animation: loader-dashArray 2s ease-in-out infinite,
                loader-dashOffset 2s linear infinite;
        }

        .loader-spin {
            animation: loader-spinDashArray 2s ease-in-out infinite,
                loader-spin 8s ease-in-out infinite,
                loader-dashOffset 2s linear infinite;
            transform-origin: center;
        }

        @keyframes loader-dashArray {
            0% {
                stroke-dasharray: 0 1 359 0;
            }
            50% {
                stroke-dasharray: 0 359 1 0;
            }
            100% {
                stroke-dasharray: 359 1 0 0;
            }
        }

        @keyframes loader-spinDashArray {
            0% {
                stroke-dasharray: 270 90;
            }
            50% {
                stroke-dasharray: 0 360;
            }
            100% {
                stroke-dasharray: 270 90;
            }
        }

        @keyframes loader-dashOffset {
            0% {
                stroke-dashoffset: 365;
            }
            100% {
                stroke-dashoffset: 5;
            }
        }

        @keyframes loader-spin {
            0% {
                transform: rotate(0deg);
            }
            12.5%,
            25% {
                transform: rotate(270deg);
            }
            37.5%,
            50% {
                transform: rotate(540deg);
            }
            62.5%,
            75% {
                transform: rotate(810deg);
            }
            87.5%,
            100% {
                transform: rotate(1080deg);
            }
        }
      `}</style>
      <div className="loader-container">
        {/* O */}
        <svg height="0" width="0" viewBox="0 0 64 64" className="loader-absolute">
            <defs xmlns="http://www.w3.org/2000/svg">
                <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="o-gradient">
                    <stop stopColor="#FFC800"></stop>
                    <stop stopColor="#F0F" offset="1"></stop>
                    <animateTransform repeatCount="indefinite" keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" dur="8s" values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" type="rotate" attributeName="gradientTransform"></animateTransform>
                </linearGradient>
                {/* T */}
                <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="t-gradient">
                    <stop stopColor="#FF5733"></stop>
                    <stop stopColor="#C70039" offset="1"></stop>
                </linearGradient>
                {/* I */}
                <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="i-gradient">
                    <stop stopColor="#00E0ED"></stop>
                    <stop stopColor="#00DA72" offset="1"></stop>
                </linearGradient>
                {/* V */}
                <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="v-gradient">
                    <stop stopColor="#9C27B0"></stop>
                    <stop stopColor="#673AB7" offset="1"></stop>
                </linearGradient>
                {/* O2 (second O) */}
                <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="o2-gradient">
                    <stop stopColor="#4CAF50"></stop>
                    <stop stopColor="#2196F3" offset="1"></stop>
                    <animateTransform repeatCount="indefinite" keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" dur="6s" values="0 32 32;180 32 32;180 32 32;360 32 32;360 32 32;540 32 32;540 32 32;720 32 32;720 32 32" type="rotate" attributeName="gradientTransform"></animateTransform>
                </linearGradient>
            </defs>
        </svg>

        {/* O - Circle */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 64 64" height="64" width="64" className="loader-inline-block">
            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="10" stroke="url(#o-gradient)" d="M 32 32
                m 0 -27
                a 27 27 0 1 1 0 54
                a 27 27 0 1 1 0 -54" className="loader-spin" id="o" pathLength="360"></path>
        </svg>

        {/* T - Modified Y shape to look like T */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 64 64" height="64" width="64" className="loader-inline-block">
            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="8" stroke="url(#t-gradient)" d="M 10,10 h 44 v 10 h -15 v 34 h -14 v -34 h -15 Z" className="loader-dash" id="t" pathLength="360"></path>
        </svg>

        {/* I - Simple vertical line */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 64 64" height="64" width="64" className="loader-inline-block">
            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="8" stroke="url(#i-gradient)" d="M 32,10 v 44" className="loader-dash" id="i" pathLength="360"></path>
        </svg>

        {/* V - Modified U shape to look like V */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 64 64" height="64" width="64" className="loader-inline-block">
            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="8" stroke="url(#v-gradient)" d="M 10,10 l 22,44 l 22,-44" className="loader-dash" id="v" pathLength="360"></path>
        </svg>

        {/* O2 - Second O (different style) */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 64 64" height="64" width="64" className="loader-inline-block">
            <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="8" stroke="url(#o2-gradient)" d="M 32 32
                m 0 -20
                a 20 20 0 1 1 0 40
                a 20 20 0 1 1 0 -40" className="loader-spin" id="o2" pathLength="360"></path>
        </svg>
      </div>
    </div>
  );
}
