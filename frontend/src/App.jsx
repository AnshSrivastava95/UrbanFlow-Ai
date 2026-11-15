
import { useEffect, useState } from "react";
import { getTrafficSummary } from "./api";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  CircleDot,
  Clock3,
  Code2,
  Layers3,
  Menu,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  Waypoints,
  X,
} from "lucide-react";
import "./index.css";

const features = [
  {
    number: "01",
    icon: BrainCircuit,
    title: "Behaviour Intelligence",
    description:
      "Uncover hidden patterns in urban mobility through unsupervised machine learning and behavioural clustering.",
  },
  {
    number: "02",
    icon: Route,
    title: "Mobility Mapping",
    description:
      "Explore how buses, vehicles and road networks interact across the urban transportation ecosystem.",
  },
  {
    number: "03",
    icon: Network,
    title: "Intersection Innovation",
    description:
      "Investigate alternative intersection configurations through data-driven traffic analysis.",
  },
  {
    number: "04",
    icon: Activity,
    title: "Simulation & Evaluation",
    description:
      "Evaluate traffic scenarios using microscopic simulation and measurable performance indicators.",
  },
];

const stats = [
  { value: "01", label: "Research city", sub: "Bengaluru, India" },
  { value: "04", label: "Core capabilities", sub: "From data to simulation" },
  { value: "AI", label: "Research approach", sub: "Unsupervised learning" },
];


function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    ["Overview", "#overview"],
    ["Research", "#research"],
    ["Technology", "#technology"],
    ["About", "#about"],
  ];

  return (
    <header className="navbar">
      <a className="brand" href="#overview" onClick={() => setOpen(false)}>
        <span className="brand-mark"><Waypoints size={21} /></span>
        <span>URBAN<span>FLOW</span><small>AI RESEARCH PLATFORM</small></span>
      </a>

      <nav className={open ? "nav-links nav-open" : "nav-links"}>
        {links.map(([name, href]) => (
          <a key={name} href={href} onClick={() => setOpen(false)}>
            {name}
          </a>
        ))}
        <a className="nav-mobile-cta" href="#research" onClick={() => setOpen(false)}>
          Explore platform <ArrowUpRight size={15} />
        </a>
      </nav>

      <a className="nav-cta" href="#research">
        Explore platform <ArrowUpRight size={15} />
      </a>

      <button
        className="menu-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}

function TrafficPreview() {
  const [traffic, setTraffic] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getTrafficSummary()
      .then((data) => {
        if (active) setTraffic(data);
      })
      .catch((err) => {
        console.error("UrbanFlow API error:", err);
        if (active) setError("Unable to connect to the UrbanFlow API.");
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">CONNECTION ERROR</span>
            <h3>Traffic intelligence</h3>
          </div>
          <span className="demo-tag"><span /> OFFLINE</span>
        </div>
        <p>{error}</p>
        <button
          className="button-outline"
          onClick={() => window.location.reload()}
        >
          Retry connection
        </button>
      </div>
    );
  }

  if (!traffic) {
    return (
      <div className="dashboard">
        <div className="dashboard-top">
          <div>
            <span className="eyebrow">CONNECTING</span>
            <h3>Traffic intelligence</h3>
          </div>
          <span className="demo-tag"><span /> LOADING</span>
        </div>
        <p>Connecting to the UrbanFlow AI backend...</p>
      </div>
    );
  }

  const trafficData = traffic.hourly_activity || [];
  const clusters = traffic.clusters || [];

  return (
    <div className="dashboard">
      <div className="dashboard-top">
        <div>
          <span className="eyebrow">API CONNECTED</span>
          <h3>Traffic intelligence</h3>
        </div>
        <span className="demo-tag">
          <span />
          {traffic.is_demo ? "DEMO DATA" : "RESEARCH DATA"}
        </span>
      </div>

      <div className="dashboard-location">
        <div className="location-icon"><Route size={17} /></div>
        <div>
          <strong>{traffic.city} Urban Network</strong>
          <span>Connected to UrbanFlow backend</span>
        </div>
        <ChevronDown size={17} className="muted-icon" />
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span>Traffic intensity</span>
          <strong>{traffic.traffic_intensity}<small>/100</small></strong>
          <span className="metric-change">
            <Activity size={13} />
            {traffic.is_demo ? "Illustrative" : "API data"}
          </span>
        </div>

        <div className="metric-card">
          <span>Behaviour clusters</span>
          <strong>{String(traffic.behaviour_clusters).padStart(2, "0")}</strong>
          <span className="metric-change">API response</span>
        </div>

        <div className="metric-card">
          <span>Network status</span>
          <strong className="status-value">{traffic.network_status}</strong>
          <span className="metric-change">Backend response</span>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-heading">
          <div>
            <span className="chart-label">TRAFFIC ACTIVITY</span>
            <h4>Hourly intensity profile</h4>
          </div>
          <div className="period-switch">
            <button className="period-active" type="button" disabled>
              Today
            </button>
          </div>
        </div>

        <div className="chart">
          {trafficData.map((item, index) => (
            <div className="chart-column" key={item.time}>
              <motion.div
                className="chart-bar"
                initial={{ height: 0 }}
                whileInView={{ height: `${item.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.035 }}
              />
              <span>{item.time.slice(0, 2)}</span>
            </div>
          ))}
        </div>

        <div className="chart-footer">
          <span>
            <span className="legend-dot" />
            {traffic.is_demo
              ? "Illustrative traffic intensity"
              : "Measured traffic intensity"}
          </span>
          <span>API response</span>
        </div>
      </div>

      <div className="cluster-preview">
        <div className="cluster-title">
          <span className="chart-label">BEHAVIOUR SEGMENTS</span>
          <span className="cluster-count">{clusters.length} clusters</span>
        </div>
        <div className="cluster-list">
          {clusters.map((cluster) => (
            <div className="cluster-row" key={cluster.name}>
              <span className={`cluster-dot ${cluster.color}`} />
              <span>{cluster.name}</span>
              <strong>{cluster.percentage}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <main>
      <Navbar />

      <section className="hero" id="overview">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-grid" />

        <div className="hero-content">
          <Reveal>
            <div className="hero-label">
              <span className="label-line" />
              THE FUTURE OF URBAN MOBILITY
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <h1>
              Beyond traffic.
              <br />
              <span>Beyond signals.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.23}>
            <p className="hero-description">
              Understanding the invisible patterns of urban movement.
              Building a smarter perspective on how cities move.
            </p>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="hero-actions">
              <a href="#research" className="button-gold">
                Discover UrbanFlow <ArrowUpRight size={17} />
              </a>
              <a href="#technology" className="button-text">
                Explore our approach <ArrowDownRight size={17} />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.45}>
            <div className="hero-bottom">
              <div className="hero-location">
                <span className="location-pulse" />
                BENGALURU, INDIA
              </div>
              <span>AN AI-DRIVEN MOBILITY RESEARCH INITIATIVE</span>
            </div>
          </Reveal>
        </div>

        <div className="hero-side-note">01 / INTELLIGENT MOBILITY</div>
        <a href="#research" className="scroll-indicator">
          <span>SCROLL TO EXPLORE</span>
          <div><ArrowDownRight size={16} /></div>
        </a>
      </section>

      <section className="intro-section section-pad" id="research">
        <Reveal>
          <div className="section-kicker"><span>01</span> THE VISION</div>
          <div className="intro-grid">
            <h2>
              Cities are complex.
              <br />
              <em>Movement shouldn't be.</em>
            </h2>
            <div className="intro-copy">
              <p>
                UrbanFlow AI is a research initiative exploring how
                machine learning and traffic simulation can help us
                understand urban transportation systems.
              </p>
              <p>
                By discovering recurring traffic behaviours and evaluating
                alternative intersection configurations, we aim to
                investigate new possibilities for urban mobility.
              </p>
              <a href="#technology" className="inline-link">
                Explore the research <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </Reveal>

        <div className="stats-row">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.1}>
              <div className="stat-item">
                <strong>{stat.value}</strong>
                <div>
                  <span>{stat.label}</span>
                  <small>{stat.sub}</small>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="features-section section-pad" id="technology">
        <Reveal>
          <div className="section-heading">
            <div>
              <div className="section-kicker"><span>02</span> OUR CAPABILITIES</div>
              <h2>Intelligence in <em>every direction.</em></h2>
            </div>
            <p>
              A connected research framework that moves from raw mobility
              data to measurable simulation outcomes.
            </p>
          </div>
        </Reveal>

        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.number} delay={index * 0.1}>
                <article className="feature-card">
                  <div className="feature-top">
                    <span>{feature.number}</span>
                    <Icon size={24} strokeWidth={1.35} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-bottom">
                    <span>EXPLORE CAPABILITY</span>
                    <ArrowUpRight size={16} />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section section-pad">
        <Reveal>
          <div className="section-kicker"><span>03</span> THE INTELLIGENCE LAYER</div>
          <div className="dashboard-layout">
            <div className="dashboard-copy">
              <h2>
                See the city
                <br />
                <em>differently.</em>
              </h2>
              <p>
                From traffic intensity to behavioural segments, the
                UrbanFlow dashboard is designed to turn complex
                transportation observations into understandable insights.
              </p>
              <div className="dashboard-points">
                <div><CircleDot size={17} /> Discover recurring traffic patterns</div>
                <div><Layers3 size={17} /> Compare behavioural clusters</div>
                <div><BarChart3 size={17} /> Explore measurable indicators</div>
              </div>
              <a href="#about" className="button-outline">
                Understand the project <ArrowUpRight size={16} />
              </a>
            </div>
            <Reveal delay={0.2}>
              <TrafficPreview />
            </Reveal>
          </div>
        </Reveal>
      </section>

      <section className="method-section section-pad">
        <Reveal>
          <div className="method-heading">
            <div className="section-kicker"><span>04</span> THE RESEARCH JOURNEY</div>
            <h2>From observation to <em>innovation.</em></h2>
            <p>Four connected stages. One data-driven research framework.</p>
          </div>
        </Reveal>

        <div className="method-track">
          {[
            ["01", "Collect", "Acquire and organise urban mobility observations.", Activity],
            ["02", "Discover", "Apply unsupervised learning to identify patterns.", BrainCircuit],
            ["03", "Evaluate", "Build and test alternative traffic scenarios.", BarChart3],
            ["04", "Understand", "Compare outcomes and interpret findings.", Sparkles],
          ].map(([number, title, description, Icon], index) => (
            <Reveal key={number} delay={index * 0.1}>
              <div className="method-step">
                <div className="method-icon"><Icon size={22} /></div>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="closing-section section-pad" id="about">
        <div className="closing-background" />
        <Reveal>
          <div className="closing-content">
            <div className="section-kicker"><span>05</span> A DIFFERENT WAY FORWARD</div>
            <h2>
              The next city
              <br />
              starts with <em>understanding.</em>
            </h2>
            <p>
              Discover the research, explore the technology and imagine
              what intelligent mobility could make possible.
            </p>
            <a href="#overview" className="button-gold">
              Back to the beginning <ArrowUpRight size={17} />
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="footer">
        <a className="brand" href="#overview">
          <span className="brand-mark"><Waypoints size={20} /></span>
          <span>URBAN<span>FLOW</span><small>AI RESEARCH PLATFORM</small></span>
        </a>
        <p>Understanding movement. Reimagining mobility.</p>
        <a
          href="https://github.com/AnshSrivastava95/UrbanFlow-Ai"
          target="_blank"
          rel="noreferrer"
          className="github-link"
        >
          <Code2 size={17} /> GitHub <ArrowUpRight size={14} />
        </a>
        <div className="footer-bottom">
          <span>© 2026 URBANFLOW AI. RESEARCH PROJECT.</span>
          <span>BUILT TO EXPLORE WHAT'S NEXT.</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
