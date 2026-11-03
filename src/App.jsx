import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileClock,
  FileText,
  LogIn,
  Menu,
  Search,
  Settings,
  Timer,
  Trophy,
  WalletCards,
  X,
} from 'lucide-react'
import './App.css'

const sidebarSports = ['Cricket', 'Casino', 'Tennis', 'Soccer', 'Horse Racing', 'Politics', 'Greyhound Racing', 'Basketball', 'Lottery']
const highlightSports = ['Cricket', 'Soccer', 'Tennis']

const sportCompetitions = {
  Cricket: ['BallByBall', 'Test Matches', 'WBBL', 'One Day Internationals', 'Ford Trophy', 'Nepal Premier League', 'South Africa T20 Challenge', 'International Twenty20 Matches'],
  Soccer: ['International Clubs', 'Premier League', 'Champions League', 'National Leagues'],
  Tennis: ['ATP', 'WTA', 'Challenger Tour', 'ITF'],
  'Horse Racing': ['Today', 'Tomorrow', 'Future Races'],
  'Greyhound Racing': ['Today', 'Tomorrow'],
  Basketball: ['NBA', 'EuroLeague', 'International'],
  Lottery: ['Daily Lottery', 'Special Draws'],
  Politics: ['Elections', 'Political Specials'],
}

const fixtureRows = [
  { id: 'ind-v-sa', sport: 'Cricket', teams: 'India Legends v South Africa Legends', date: '06-10-2026 17:00', market: 'Match Odds', live: true, odds: [{ label: '1', price: 1.79 }, { label: 'X', price: 3.4 }, { label: '2', price: 2.26 }] },
  { id: 'boland-v-storm', sport: 'Cricket', teams: 'Boland v Eastern Storm', date: '08-10-2026 21:30', market: 'Match Odds', live: false, odds: [{ label: '1', price: 2.1 }, { label: 'X', price: 2.8 }, { label: '2', price: 2.5 }] },
  { id: 'warriors-v-cape', sport: 'Cricket', teams: 'Warriors v Northern Cape', date: '08-10-2026 21:30', market: 'Match Odds', live: false, odds: [{ label: '1', price: 1.9 }, { label: 'X', price: 3.2 }, { label: '2', price: 2.3 }] },
  { id: 'ausw-v-banw', sport: 'Cricket', teams: 'Australia W v Bangladesh W', date: '09-10-2026 9:20', market: 'Match Odds', live: false, odds: [{ label: '1', price: 1.42 }, { label: 'X', price: 3.1 }, { label: '2', price: 3.6 }] },
  { id: 'afg-v-ban', sport: 'Cricket', teams: 'Afghanistan v Bangladesh', date: '09-10-2026 10:30', market: 'Match Odds', live: true, odds: [{ label: '1', price: 2.15 }, { label: 'X', price: 3.05 }, { label: '2', price: 1.88 }] },
  { id: 'sa-v-aus', sport: 'Cricket', teams: 'South Africa v Australia', date: '09-10-2026 13:30', market: 'Match Odds', live: true, odds: [{ label: '1', price: 2.2 }, { label: 'X', price: 3.75 }, { label: '2', price: 2.08 }] },
  { id: 'ind-v-wi', sport: 'Cricket', teams: 'India v West Indies', date: '09-10-2026 19:00', market: 'Match Odds', live: true, odds: [{ label: '1', price: 1.24 }, { label: 'X', price: 6.5 }, { label: '2', price: 4.8 }] },
  { id: 'pak-v-sl', sport: 'Cricket', teams: 'Pakistan v Sri Lanka', date: '09-10-2026 20:30', market: 'Match Odds', live: true, odds: [{ label: '1', price: 1.45 }, { label: 'X', price: 5.8 }, { label: '2', price: 2.9 }] },
  { id: 'manc-v-chel', sport: 'Soccer', teams: 'Manchester City v Chelsea', date: '10-10-2026 19:45', market: '1X2', live: true, odds: [{ label: '1', price: 1.68 }, { label: 'X', price: 3.8 }, { label: '2', price: 4.25 }] },
  { id: 'liver-v-ars', sport: 'Soccer', teams: 'Liverpool v Arsenal', date: '11-10-2026 17:30', market: '1X2', live: false, odds: [{ label: '1', price: 2.14 }, { label: 'X', price: 3.6 }, { label: '2', price: 2.82 }] },
  { id: 'madrid-v-atleti', sport: 'Soccer', teams: 'Real Madrid v Atletico', date: '12-10-2026 21:00', market: '1X2', live: false, odds: [{ label: '1', price: 1.9 }, { label: 'X', price: 3.4 }, { label: '2', price: 2.7 }] },
  { id: 'nadal-v-alcaraz', sport: 'Tennis', teams: 'Nadal v Alcaraz', date: '12-10-2026 14:00', market: 'Set Winner', live: true, odds: [{ label: 'Nadal', price: 2.7 }, { label: 'Alcaraz', price: 1.47 }] },
  { id: 'swiatek-v-sabalenka', sport: 'Tennis', teams: 'Swiatek v Sabalenka', date: '12-10-2026 16:30', market: 'Set Winner', live: false, odds: [{ label: 'Swiatek', price: 2.3 }, { label: 'Sabalenka', price: 1.62 }] },
]

const footerLinks = ['Privacy Policy', 'KYC', 'Terms and Conditions', 'Rules and Regulations']
const policyPaths = {
  'Privacy Policy': '/privacy',
  KYC: '/kyc',
  'Terms and Conditions': '/terms',
  'Rules and Regulations': '/rules',
  'Responsible Gambling': '/responsible-gambling',
}
const policyPages = {
  '/privacy': {
    title: 'Privacy Policy',
    intro: 'This development copy does not collect real-money customer data. A production privacy notice must be reviewed and published by the operator before launch.',
    sections: [
      ['Data collected', 'Production services must document identity, account, device, payment, betting, and support data that they collect.'],
      ['Purpose and retention', 'The operator must define lawful purposes, retention periods, access controls, deletion requests, and breach-notification procedures.'],
      ['Third parties', 'Provider, payment, analytics, and support processors must be identified with appropriate contracts and data-transfer safeguards.'],
    ],
  },
  '/kyc': {
    title: 'KYC and AML',
    intro: 'Real-money play is unavailable in this environment. No demo login is a substitute for identity, age, sanctions, or source-of-funds verification.',
    sections: [
      ['Identity and age', 'A licensed operator must verify identity and legal gambling age before enabling deposits or wagering.'],
      ['AML controls', 'The production service must apply risk-based customer due diligence, sanctions screening, transaction monitoring, escalation, and reporting.'],
      ['Account restrictions', 'Accounts must remain blocked from wagering until required checks pass and the jurisdiction is eligible.'],
    ],
  },
  '/terms': {
    title: 'Terms and Conditions',
    intro: 'These are placeholder safeguards for the development copy and are not terms for real-money use.',
    sections: [
      ['Eligibility', 'Only verified adults in permitted jurisdictions may use a production wagering service.'],
      ['Demo mode', 'Preview fixtures and the local demo account have no cash value and cannot place bets or withdraw funds.'],
      ['Operator approval', 'Production launch requires approved licensing, provider contracts, dispute handling, settlement rules, and customer support procedures.'],
    ],
  },
  '/rules': {
    title: 'Rules and Regulations',
    intro: 'Preview odds are not live markets. No wager is accepted by this development copy.',
    sections: [
      ['Market integrity', 'A production adapter must confirm current market status, selection, price, limits, and account funds server-side.'],
      ['Settlement', 'The operator must define official results, void rules, corrections, disputes, and a durable audit trail before accepting wagers.'],
      ['Technical controls', 'Production must use HTTPS, protected sessions, idempotent bet acceptance, monitoring, backups, and security review.'],
    ],
  },
  '/responsible-gambling': {
    title: 'Responsible Gambling',
    intro: 'Please only gamble where it is legal, set limits, and stop if gambling is no longer enjoyable or affordable.',
    sections: [
      ['Take a break', 'Use self-exclusion and cooling-off tools before wagering is enabled in production. Support contacts must be visible and staffed.'],
      ['Set limits', 'A production account must support deposit, loss, stake, session-time, and reality-check limits that cannot be bypassed by the client.'],
      ['Get help', 'The operator must publish locally appropriate gambling-support services and escalation routes before launch.'],
    ],
  },
}
const accountItems = [
  { label: 'Login', Icon: LogIn },
  { label: 'My Profile', Icon: CircleUserRound },
  { label: 'Rolling Commission', Icon: WalletCards },
  { label: 'Account Statement', Icon: FileText },
  { label: 'Bet History', Icon: Clock3 },
  { label: 'Profit & Loss', Icon: FileClock },
  { label: 'Password History', Icon: Settings },
  { label: 'Activity Log', Icon: Clock3 },
  { label: 'Settings', Icon: Settings },
]

const accountPaths = {
  'My Profile': '/myprofile',
  'Rolling Commission': '/rolling-commission',
  'Account Statement': '/account-statement',
  'Bet History': '/bet-history',
  'Profit & Loss': '/profit-loss',
  'Password History': '/password-history',
  'Activity Log': '/activity-log',
  Settings: '/settings',
  Login: '/login',
}

const accountSectionsByPath = Object.fromEntries(Object.entries(accountPaths).map(([section, path]) => [path, section]))

const appRoutes = {
  '/': 'Home',
  '/home': 'Home',
  '/inplay': 'In-Play',
  '/multimarket': 'Multi Markets',
  '/sports': 'Sports',
  '/casino': 'Casino',
  '/admin': 'Admin',
  '/account': 'Account',
  ...Object.fromEntries(Object.keys(policyPages).map((path) => [path, 'Policy'])),
  ...Object.fromEntries(Object.values(accountPaths).map((path) => [path, 'Account'])),
}

const casinoCategories = ['Popular', 'Universe Live', 'Universe Original', 'International', 'Slot']
const casinoGames = [
  { name: 'Vimaan', category: 'Universe Live', image: '/original/vimaan1.webp', route: '/casino/vimaan' },
  { name: '20-20 Teenpatti', category: 'Universe Live', image: '/original/20-20-teenpatti.webp', route: '/casino/20-20-teenpatti' },
  { name: 'Lucky 7', category: 'Universe Original', image: '/original/lucky-7.webp', route: '/casino/lucky-7' },
  { name: '1 Day Teenpatti', category: 'Universe Live', image: '/original/1-day-teenpatti.webp', route: '/casino/1-day-teenpatti' },
  { name: 'Joker Teenpatti', category: 'Universe Live', image: '/original/joker-teenpatti.webp', route: '/casino/joker-teenpatti' },
  { name: 'Dragon Tiger', category: 'Universe Live', image: '/original/dragontiger.webp', route: '/casino/dragon-tiger' },
  { name: 'Baccarat', category: 'Universe Live', image: '/original/baccarat.webp', route: '/casino/baccarat' },
  { name: 'Andar Bahar', category: 'Universe Live', image: '/original/andar-bahar.webp', route: '/casino/andar-bahar' },
  { name: '32 Cards', category: 'Universe Live', image: '/original/32-cards.webp', route: '/casino/32-cards' },
  { name: 'Poker', category: 'Universe Live', image: '/original/poker.webp', route: '/casino/poker' },
  { name: 'DTL', category: 'Universe Live', image: '/original/dtl.webp', route: '/casino/dtl' },
  { name: '1 Day Dragon Tiger', category: 'Universe Live', image: '/original/1-day-dragon-tiger.webp', route: '/casino/1-day-dragon-tiger' },
  { name: 'Muflis Teenpatti', category: 'Universe Live', image: '/original/muflisteenpatti-01.webp', route: '/casino/muflis-teenpatti' },
  { name: 'Card Race', category: 'Universe Live', image: '/original/cardrace.webp', route: '/casino/card-race' },
  { name: 'Amar Akbar Anthony', category: 'International', image: '/original/amarakbaranthony-01.webp', route: '/casino/amar-akbar-anthony' },
  { name: 'Dragon Tiger Live', category: 'Universe Live', image: '/original/dragon-tiger-01.webp', route: '/casino/dragon-tiger-live' },
  { name: 'Balloon', category: 'Slot', image: '/original/balloon.webp', route: '/casino/balloon' },
  { name: 'Heads & Tails', category: 'Slot', image: '/original/head-n-tails.webp', route: '/casino/heads-and-tails' },
  { name: 'Dream Catcher', category: 'Universe Original', image: '/original/8755.png', route: '/casino/dream-catcher' },
  { name: 'Lucky 0 to 9', category: 'Slot', image: '/original/lucky-0-to-9.webp', route: '/casino/lucky-0-to-9' },
]

const aviatorGame = { name: 'Aviator', category: 'Popular', image: '/original/aviator.png', route: '/casino/aviator' }
const gameByRoute = Object.fromEntries([...casinoGames, aviatorGame].map((game) => [game.route, game]))

const viewPaths = {
  Home: '/home',
  'In-Play': '/inplay',
  'Multi Markets': '/multimarket',
  Sports: '/sports',
  Casino: '/casino',
  Admin: '/admin',
  Account: '/account',
}

const defaultUser = { isLoggedIn: false, username: '', fullName: '' }

function mapProviderMarket(market) {
  return {
    id: market.id,
    sport: market.sport,
    teams: market.event,
    date: market.date || (market.live ? 'In-Play' : 'Upcoming'),
    market: market.market,
    competition: market.competition || null,
    live: Boolean(market.live),
    odds: (market.selections || []).map((selection) => ({
      label: selection.label,
      price: Number(selection.price),
      selectionId: selection.selectionId,
    })),
  }
}

function App() {
  const initialPath = window.location.pathname.replace(/\/+$/, '') || '/'
  const [activeView, setActiveView] = useState(() => appRoutes[initialPath] || (gameByRoute[initialPath] ? 'Casino' : 'Home'))
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSport, setSelectedSport] = useState('Cricket')
  const [selectedCompetition, setSelectedCompetition] = useState(null)
  const [highlightSport, setHighlightSport] = useState('Cricket')
  const [eventTab, setEventTab] = useState('In-Play')
  const [casinoCategory, setCasinoCategory] = useState('Popular')
  const [accountSection, setAccountSection] = useState(() => accountSectionsByPath[initialPath] || 'My Profile')
  const [selectedGame, setSelectedGame] = useState(() => gameByRoute[initialPath]?.name || null)
  const [loginMessage, setLoginMessage] = useState('')
  const [pinnedMarkets, setPinnedMarkets] = useState([])
  const [headerUsername, setHeaderUsername] = useState('')
  const [headerPassword, setHeaderPassword] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [user, setUser] = useState(defaultUser)
  const [wallet, setWallet] = useState(null)
  const [betHistory, setBetHistory] = useState([])
  const [providerStatus, setProviderStatus] = useState(null)
  const [providerMarkets, setProviderMarkets] = useState([])
  const [slip, setSlip] = useState([])
  const [adminUser, setAdminUser] = useState(null)
  const [adminOverview, setAdminOverview] = useState(null)
  const [adminPayments, setAdminPayments] = useState([])
  const [walletCustomerId, setWalletCustomerId] = useState('')
  const [walletLookup, setWalletLookup] = useState(null)
  const [walletAction, setWalletAction] = useState('deposit')
  const [walletAmount, setWalletAmount] = useState('')
  const [walletNote, setWalletNote] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [adminLoading, setAdminLoading] = useState(() => initialPath === '/admin')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [ageConfirmed, setAgeConfirmed] = useState(() => window.localStorage.getItem('exchange_age_confirmed') === 'true')

  useEffect(() => {
    const loadServerState = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        setProviderStatus(await response.json())
      } catch {
        setProviderStatus({ status: 'offline', provider: { configured: false } })
      }

      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const session = await response.json()
          if (!session.authenticated) return
          const sessionUser = session.user
          setUser({ isLoggedIn: true, ...sessionUser })
          const accountResponse = await fetch('/api/account')
          if (accountResponse.ok) {
            const { account } = await accountResponse.json()
            if (Number.isFinite(account?.balance)) setWallet(account.balance)
          }
        }
      } catch {
        setLoginMessage('Could not restore the provider session. Please sign in again.')
      }
    }

    loadServerState()
  }, [])

  useEffect(() => {
    if (!providerStatus?.provider?.configured || !selectedSport || selectedSport === 'Casino') {
      return undefined
    }

    let cancelled = false
    fetch(`/api/markets?sport=${encodeURIComponent(selectedSport)}`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load provider markets.')
        if (!cancelled) setProviderMarkets(Array.isArray(result.markets) ? result.markets.map(mapProviderMarket) : [])
      })
      .catch((error) => {
        if (!cancelled) setLoginMessage(error.message || 'Could not load provider markets.')
      })

    return () => {
      cancelled = true
    }
  }, [providerStatus, selectedSport])

  useEffect(() => {
    const restoreRoute = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/'
      setActiveView(appRoutes[path] || (gameByRoute[path] ? 'Casino' : 'Home'))
      setAccountSection(accountSectionsByPath[path] || 'My Profile')
      setSelectedGame(gameByRoute[path]?.name || null)
      if (!path.startsWith('/event/')) setSelectedEvent(null)
    }

    window.addEventListener('popstate', restoreRoute)
    return () => window.removeEventListener('popstate', restoreRoute)
  }, [])

  useEffect(() => {
    if (!user.isLoggedIn || accountSection !== 'Bet History') return undefined
    let cancelled = false

    fetch('/api/bets')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load bet history.')
        if (!cancelled) setBetHistory(Array.isArray(result.bets) ? result.bets : [])
      })
      .catch((error) => {
        if (!cancelled) setLoginMessage(error.message || 'Could not load bet history.')
      })

    return () => {
      cancelled = true
    }
  }, [accountSection, user.isLoggedIn])

  const navigateTo = (view, path = viewPaths[view], gameName = null) => {
    setActiveView(view)
    setSelectedGame(gameName)
    setSearchOpen(false)
    setSearchTerm('')
    if (view === 'Admin') {
      setAdminLoading(true)
      setAdminMessage('')
    }
    if (path && window.location.pathname !== path) {
      window.history.pushState({ view }, '', path)
    }
  }

  const navigateAccountSection = (section) => {
    setAccountSection(section)
    setLoginMessage('')
    navigateTo('Account', accountPaths[section] || '/account')
  }

  const openEvent = (match) => {
    setSelectedEvent(match)
    setActiveView('Event')
    setSearchOpen(false)
    setSearchTerm('')
    if (window.location.pathname !== `/event/${match.id}`) window.history.pushState({ view: 'Event' }, '', `/event/${match.id}`)
  }

  const confirmAge = () => {
    window.localStorage.setItem('exchange_age_confirmed', 'true')
    setAgeConfirmed(true)
  }

  const fetchAdminDashboard = async () => {
    const sessionResponse = await fetch('/api/admin/session')
    const sessionResult = await sessionResponse.json()
    if (!sessionResponse.ok) throw new Error(sessionResult.message || 'Admin service is unavailable.')
    if (!sessionResult.configured) throw new Error(sessionResult.message || 'Admin service is not configured.')
    if (!sessionResult.authenticated) return { user: null, overview: null }

    const overviewResponse = await fetch('/api/admin/overview')
    const overviewResult = await overviewResponse.json()
    if (!overviewResponse.ok) throw new Error(overviewResult.message || 'Could not load the operator dashboard.')
    let payments = []
    if (sessionResult.user.permissions?.includes('wallets:manage')) {
      const paymentsResponse = await fetch('/api/admin/wallet/payments?status=pending')
      if (paymentsResponse.ok) payments = (await paymentsResponse.json()).payments || []
    }
    return { user: sessionResult.user, overview: overviewResult, payments }
  }

  const signInAdmin = async (event) => {
    event.preventDefault()
    setAdminMessage('')
    setAdminLoading(true)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Admin sign-in failed.')
      setAdminPassword('')
      const dashboard = await fetchAdminDashboard()
      setAdminUser(dashboard.user)
      setAdminOverview(dashboard.overview)
      setAdminPayments(dashboard.payments)
    } catch (error) {
      setAdminMessage(error.message || 'Admin sign-in failed.')
    } finally {
      setAdminLoading(false)
    }
  }

  const signOutAdmin = async () => {
    setAdminMessage('')
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Could not end the admin session.')
      setAdminUser(null)
      setAdminOverview(null)
      setAdminPayments([])
    } catch (error) {
      setAdminMessage(error.message || 'Could not end the admin session.')
    }
  }

  useEffect(() => {
    if (activeView !== 'Admin') return undefined
    let cancelled = false
    fetchAdminDashboard()
      .then((dashboard) => {
        if (cancelled) return
        setAdminUser(dashboard.user)
        setAdminOverview(dashboard.overview)
        setAdminPayments(dashboard.payments)
        setAdminMessage('')
      })
      .catch((error) => {
        if (!cancelled) setAdminMessage(error.message || 'Could not load the operator dashboard.')
      })
      .finally(() => {
        if (!cancelled) setAdminLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeView])

  const lookupWallet = async (event) => {
    event.preventDefault()
    setAdminMessage('')
    try {
      const response = await fetch(`/api/admin/wallet/balance?customerId=${encodeURIComponent(walletCustomerId)}&currency=INR`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not load wallet balance.')
      setWalletLookup(result.wallet)
    } catch (error) {
      setAdminMessage(error.message || 'Could not load wallet balance.')
    }
  }

  const submitWalletRequest = async (event) => {
    event.preventDefault()
    setAdminMessage('')
    try {
      const amountMinor = Math.round(Number(walletAmount) * 100)
      if (!walletCustomerId.trim() || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('Enter a customer id and a positive amount.')
      const response = await fetch(`/api/admin/wallet/${walletAction}-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: walletCustomerId.trim(),
          currency: 'INR',
          amountMinor,
          note: walletNote,
          idempotencyKey: `${walletAction}-${crypto.randomUUID()}`,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not create wallet request.')
      setWalletAmount('')
      setWalletNote('')
      setAdminMessage(`${walletAction === 'deposit' ? 'Deposit' : 'Withdrawal'} request created.`)
      const paymentsResponse = await fetch('/api/admin/wallet/payments?status=pending')
      if (paymentsResponse.ok) setAdminPayments((await paymentsResponse.json()).payments || [])
      await lookupWallet({ preventDefault: () => {} })
    } catch (error) {
      setAdminMessage(error.message || 'Could not create wallet request.')
    }
  }

  const reviewPayment = async (paymentId, action) => {
    setAdminMessage('')
    try {
      const response = await fetch(`/api/admin/wallet/payments/${paymentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: walletNote }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || `Could not ${action} payment.`)
      setAdminMessage(`Payment ${action}d.`)
      const paymentsResponse = await fetch('/api/admin/wallet/payments?status=pending')
      if (paymentsResponse.ok) setAdminPayments((await paymentsResponse.json()).payments || [])
      if (walletCustomerId) await lookupWallet({ preventDefault: () => {} })
    } catch (error) {
      setAdminMessage(error.message || `Could not ${action} payment.`)
    }
  }

  const visibleGames = casinoGames.filter((game) => casinoCategory === 'Popular' || game.category === casinoCategory)

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const searchMatches = (value) => !normalizedSearchTerm || value.toLowerCase().includes(normalizedSearchTerm)
  const filteredGames = visibleGames.filter((game) => searchMatches(`${game.name} ${game.category}`))

  const marketRows = providerStatus?.provider?.configured ? providerMarkets : fixtureRows

  const searchSuggestions = normalizedSearchTerm ? [
    ...sidebarSports
      .filter((sport) => sport !== 'Casino' && sport.toLowerCase().includes(normalizedSearchTerm))
      .map((sport) => ({ type: 'sport', label: sport, detail: 'Sport' })),
    ...[...casinoGames, aviatorGame]
      .filter((game) => `${game.name} ${game.category}`.toLowerCase().includes(normalizedSearchTerm))
      .map((game) => ({ type: 'game', label: game.name, detail: `Casino · ${game.category}`, game })),
    ...marketRows
      .filter((match) => `${match.teams} ${match.date} ${match.market}`.toLowerCase().includes(normalizedSearchTerm))
      .map((match) => ({ type: 'event', label: match.teams, detail: `${match.sport} · ${match.date}`, match })),
  ].slice(0, 8) : []

  const homeFixtures = marketRows.filter((match) => match.sport === highlightSport && (!normalizedSearchTerm || `${match.teams} ${match.date} ${match.market}`.toLowerCase().includes(normalizedSearchTerm)))

  const eventFixtures = marketRows.filter((match) => {
    if (!searchMatches(`${match.teams} ${match.date} ${match.market}`)) return false
    if (eventTab === 'In-Play') return match.live
    if (eventTab === 'Today') return !match.live
    return false
  })
  const selectedGameData = [...casinoGames, aviatorGame].find((game) => game.name === selectedGame)
  const pinnedFixtures = marketRows.filter((match) => pinnedMarkets.includes(match.id))
  const sportFixtures = marketRows.filter((match) => match.sport === selectedSport)
  const filteredSportFixtures = selectedCompetition
    ? sportFixtures.filter((match) => (!match.competition || match.competition === selectedCompetition) && searchMatches(`${match.teams} ${match.date} ${match.market}`))
    : sportFixtures.filter((match) => searchMatches(`${match.teams} ${match.date} ${match.market}`))

  const runSearch = (value = searchTerm) => {
    const query = value.trim().toLowerCase()
    if (!query) return

    const sport = sidebarSports.find((item) => item !== 'Casino' && item.toLowerCase() === query)
    if (sport) {
      setSelectedSport(sport)
      setSelectedCompetition(null)
      navigateTo('Sports')
      return
    }

    const game = [...casinoGames, aviatorGame].find((item) => item.name.toLowerCase() === query || item.name.toLowerCase().startsWith(query))
    if (game) {
      navigateTo('Casino', game.route, game.name)
      return
    }

    const event = marketRows.find((match) => match.teams.toLowerCase() === query || match.teams.toLowerCase().startsWith(query))
    if (event) {
      openEvent(event)
    }
  }

  const selectSearchSuggestion = (suggestion) => {
    if (suggestion.type === 'sport') runSearch(suggestion.label)
    if (suggestion.type === 'game') navigateTo('Casino', suggestion.game.route, suggestion.game.name)
    if (suggestion.type === 'event') openEvent(suggestion.match)
    setSearchOpen(false)
    setSearchTerm('')
  }

  const addSlipSelection = (match, option) => {
    const item = {
      id: `${match.id}-${option.label}`,
      selectionId: option.selectionId || `${match.id}:${option.label}`,
      matchName: match.teams,
      sport: match.sport,
      market: match.market,
      option: option.label,
      price: option.price,
      stake: 10,
    }

    setSlip((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === item.id)
      if (existingIndex >= 0) {
        const next = [...current]
        next[existingIndex] = { ...next[existingIndex], ...item }
        return next
      }
      return [...current, item]
    })
  }

  const updateSlipStake = (id, nextStake) => {
    const numericStake = Number(nextStake)
    setSlip((current) => current.map((entry) => (
      entry.id === id ? { ...entry, stake: Number.isFinite(numericStake) ? Math.max(0, numericStake) : 0 } : entry
    )))
  }

  const removeSlipEntry = (id) => {
    setSlip((current) => current.filter((entry) => entry.id !== id))
  }

  const totalStake = slip.reduce((sum, entry) => sum + Number(entry.stake || 0), 0)
  const totalPotentialReturn = slip.reduce((sum, entry) => sum + Number(entry.stake || 0) * Number(entry.price || 1), 0)

  const placeBets = async () => {
    if (!user.isLoggedIn) {
      setLoginMessage('Sign in before placing a bet.')
      navigateAccountSection('Login')
      return
    }
    if (user.isDemo) {
      setLoginMessage('Demo accounts cannot place bets. Live wagering requires a verified provider account.')
      return
    }
    if (!slip.length || slip.some((entry) => Number(entry.stake) <= 0)) {
      setLoginMessage('Add a positive stake before placing a bet.')
      return
    }

    try {
      const placed = []
      for (const entry of slip) {
        const response = await fetch('/api/bets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            selectionId: entry.selectionId,
            side: 'back',
            stake: Number(entry.stake),
            odds: Number(entry.price),
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'The provider rejected this bet.')
        placed.push(result.bet)
      }

      const accountResponse = await fetch('/api/account')
      if (accountResponse.ok) {
        const { account } = await accountResponse.json()
        if (Number.isFinite(account?.balance)) setWallet(account.balance)
      }
      setSlip([])
      setLoginMessage(`${placed.length} bet${placed.length === 1 ? '' : 's'} placed successfully.`)
      if (accountSection === 'Bet History') {
        const historyResponse = await fetch('/api/bets')
        if (historyResponse.ok) setBetHistory((await historyResponse.json()).bets || [])
      }
    } catch (error) {
      setLoginMessage(error.message || 'Could not place the bet.')
    }
  }
  const signIn = async (username, password) => {
    setLoginMessage('')
    try {
      if (username.trim().toLowerCase() === 'demo' && password === 'demo1234' && !providerStatus?.provider?.configured) {
        const demoResponse = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'demo', password: 'demo1234' }),
        }).catch(() => null)
        const demoResult = demoResponse?.ok ? await demoResponse.json() : null
        setUser({ isLoggedIn: true, isDemo: true, ...(demoResult?.user || { id: 'demo', username: 'demo', fullName: 'Demo Player' }) })
        setWallet(10000)
        setLoginUsername('')
        setLoginPassword('')
        setHeaderUsername('')
        setHeaderPassword('')
        setAccountSection('My Profile')
        navigateTo('Account', accountPaths['My Profile'])
        return
      }
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Provider sign-in failed.')
      setUser({ isLoggedIn: true, ...result.user })
      const accountResponse = await fetch('/api/account')
      if (accountResponse.ok) {
        const { account } = await accountResponse.json()
        if (Number.isFinite(account?.balance)) setWallet(account.balance)
      }
      setAccountSection('My Profile')
      navigateTo('Account', accountPaths['My Profile'])
    } catch (error) {
      setUser(defaultUser)
      setLoginMessage(error.message || 'Provider sign-in failed.')
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(defaultUser)
      setWallet(null)
      setAccountSection('Login')
      navigateTo('Account', accountPaths.Login)
    } catch {
      setLoginMessage('Could not sign out from the provider. Please try again.')
    }
  }

  return (
    <div className="exchange-app">
      <header className="event-header">
        <button className="exchange-brand" type="button" aria-label="AA Exchange Home" onClick={() => navigateTo('Home')}>
          <img src="/aa-exchange-logo.png" alt="AA Exchange" />
        </button>

        <button
          className="search-toggle"
          type="button"
          aria-label={searchOpen ? 'Close search' : 'Search events'}
          aria-expanded={searchOpen}
          onClick={() => {
            if (searchOpen) {
              setSearchOpen(false)
              setSearchTerm('')
            } else {
              setSearchOpen(true)
            }
          }}
        >
          {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
        </button>

        <form
          className="header-login"
          onSubmit={(event) => {
            event.preventDefault()
            signIn(headerUsername, headerPassword)
          }}
        >
          <input aria-label="Username" autoComplete="username" placeholder="Username" value={headerUsername} onChange={(event) => setHeaderUsername(event.target.value)} />
          <input aria-label="Password" autoComplete="current-password" placeholder="Password" type="password" value={headerPassword} onChange={(event) => setHeaderPassword(event.target.value)} />
          <button type="submit" disabled={!providerStatus?.provider?.configured && !(headerUsername.trim().toLowerCase() === 'demo' && headerPassword === 'demo1234')}><LogIn aria-hidden="true" /> Login</button>
        </form>
      </header>

      <nav className="primary-nav" aria-label="Main navigation">
        {['Home', 'In-Play', 'Multi Markets', 'Cricket', 'Vimaan', 'Tennis', 'Soccer', 'Horse Racing', 'Politics', 'Greyhound Racing', 'Basketball', 'Lottery', 'Live Casino', 'Tips & Previews', 'Account', 'Admin'].map((label) => {
          const destination = label === 'Live Casino' ? 'Casino' : label === 'Tips & Previews' ? 'Sports' : ['Cricket', 'Vimaan', 'Tennis', 'Soccer', 'Horse Racing', 'Greyhound Racing', 'Basketball', 'Lottery'].includes(label) ? 'Sports' : label
          const selected = label === activeView || (activeView === 'Sports' && label === selectedSport) || (label === 'Live Casino' && activeView === 'Casino')
          return (
            <button
              className={selected ? 'selected' : ''}
              key={label}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => {
                if (['Cricket', 'Vimaan', 'Tennis', 'Soccer', 'Horse Racing', 'Politics', 'Greyhound Racing', 'Basketball', 'Lottery'].includes(label)) {
                  setSelectedSport(label)
                  setSelectedCompetition(null)
                  if (label === 'Vimaan') navigateTo('Casino', '/casino/vimaan', 'Vimaan')
                  else navigateTo('Sports')
                } else if (label === 'Account') {
                  navigateAccountSection(user.isLoggedIn ? 'My Profile' : 'Login')
                } else {
                  navigateTo(destination)
                }
              }}
            >
              {label}
            </button>
          )
        })}
      </nav>

      <div className={`provider-notice${providerStatus?.provider?.configured ? ' provider-ready' : ''}`} role="status">
         {providerStatus?.provider?.configured
           ? `${providerStatus.provider.name} configured. ${providerMarkets.length} provider market${providerMarkets.length === 1 ? '' : 's'} loaded.`
          : providerStatus?.status === 'offline'
            ? 'Exchange API is unavailable. No live odds or bets are available.'
            : 'No licensed betting provider is configured. Fixture odds are preview data; login and betting are disabled.'}
      </div>

      {(searchOpen || (activeView !== 'Home' && activeView !== 'Casino')) && (
        <section className={`event-notice${searchOpen ? ' is-searching' : ''}`} aria-live="polite">
          {searchOpen ? (
            <div className="event-search-wrap">
              <label className="event-search">
                <Search aria-hidden="true" />
                <input
                  autoFocus
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      runSearch()
                    }
                  }}
                  placeholder="Search sports, events and games"
                  aria-label="Search events"
                />
              </label>
              {searchSuggestions.length > 0 && (
                <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
                  {searchSuggestions.map((suggestion) => (
                    <button key={`${suggestion.type}-${suggestion.label}`} type="button" role="option" onClick={() => selectSearchSuggestion(suggestion)}>
                      <strong>{suggestion.label}</strong>
                      <span>{suggestion.detail}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <h1 className="view-title">{selectedGame || activeView}</h1>
          )}
        </section>
      )}

      <div className="site-content-layout">
        <aside className="site-sports-sidebar" aria-label="Sports">
          {sidebarSports.map((sport) => {
            const selected = activeView === 'Casino' ? sport === 'Casino' : selectedSport === sport
            return (
                <button
                className={selected ? 'selected' : ''}
                key={sport}
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => {
                  if (sport === 'Casino') navigateTo('Casino')
                  else if (sport === 'Vimaan') navigateTo('Casino', '/casino/vimaan', 'Vimaan')
                  else {
                    setSelectedSport(sport)
                    setSelectedCompetition(null)
                    navigateTo('Sports')
                  }
                }}
              >
                <span>{sport}</span>
                <ChevronRight aria-hidden="true" />
              </button>
            )
          })}
        </aside>

        <div className="main-column">
          <main className={`content-space view-${activeView.toLowerCase().replace(/[^a-z]+/g, '-')}`} aria-label={`${activeView} page`}>
            {activeView === 'Event' && selectedEvent && (
              <section className="event-detail-page page-panel">
                <div className="page-toolbar">
                  <div>
                    <button className="back-button" type="button" onClick={() => navigateTo('Home')}><ArrowLeft aria-hidden="true" /> Back to markets</button>
                    <span className="event-detail-sport">{selectedEvent.sport} {selectedEvent.live ? '· In-Play' : '· Upcoming'}</span>
                    <h2>{selectedEvent.teams}</h2>
                  </div>
                  <button className="multi-toggle" type="button" onClick={() => setPinnedMarkets((current) => current.includes(selectedEvent.id) ? current.filter((id) => id !== selectedEvent.id) : [...current, selectedEvent.id])}>
                    {pinnedMarkets.includes(selectedEvent.id) ? 'Remove from Multi Markets' : 'Add to Multi Markets'}
                  </button>
                </div>
                <div className="event-detail-market">
                  <div className="market-heading"><strong>{selectedEvent.market}</strong><span>{selectedEvent.date}</span></div>
                  <div className="event-detail-selections">
                    {selectedEvent.odds.map((option) => (
                      <button key={option.selectionId || option.label} type="button" disabled={!providerStatus?.provider?.configured} onClick={() => addSlipSelection(selectedEvent, option)}>
                        <strong>{option.label}</strong><span>{option.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
            {activeView === 'Policy' && (
              <section className="policy-page page-panel">
                {(() => {
                  const policy = policyPages[window.location.pathname] || policyPages['/responsible-gambling']
                  return (
                    <>
                      <button className="back-button" type="button" onClick={() => navigateTo('Home')}> <ArrowLeft aria-hidden="true" /> Back to home</button>
                      <span className="policy-eyebrow">SAFETY AND COMPLIANCE</span>
                      <h2>{policy.title}</h2>
                      <p className="policy-intro">{policy.intro}</p>
                      <div className="policy-sections">
                        {policy.sections.map(([heading, body]) => (
                          <article key={heading}>
                            <h3>{heading}</h3>
                            <p>{body}</p>
                          </article>
                        ))}
                      </div>
                      <p className="policy-development-note">Development status: real-money wagering is disabled until licensing, jurisdiction approval, KYC/AML, payments, responsible-gambling controls, auditability, and security review are completed.</p>
                    </>
                  )
                })()}
              </section>
            )}
            {activeView === 'Admin' && (
              <section className="admin-page page-panel">
                <div className="admin-heading page-toolbar">
                  <div>
                    <span className="admin-eyebrow">OPERATIONS</span>
                    <h2>Operator dashboard</h2>
                  </div>
                  {adminUser && (
                    <div className="admin-identity">
                      <span>{adminUser.fullName} · {adminUser.role}</span>
                      <button type="button" onClick={signOutAdmin}>Sign out</button>
                    </div>
                  )}
                </div>

                {adminMessage && <p className="admin-message" role="alert">{adminMessage}</p>}

                {adminLoading ? (
                  <div className="admin-empty-state">Loading secure operator session…</div>
                ) : !adminUser ? (
                  <div className="admin-login-panel">
                    <div>
                      <strong>Operator access</strong>
                      <p>Sign in with a separately provisioned operator account. Customer/provider credentials do not grant admin access.</p>
                    </div>
                    <form className="admin-login-form" onSubmit={signInAdmin}>
                      <label>Email<input type="email" autoComplete="username" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required /></label>
                      <label>Password<input type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required /></label>
                      <button className="login-button" type="submit" disabled={!providerStatus?.admin?.databaseConfigured || adminLoading}>Sign in</button>
                    </form>
                    <p className="admin-bootstrap-help">Set up PostgreSQL, run the schema migration, then create the first administrator with the documented bootstrap command.</p>
                  </div>
                ) : (
                  <>
                    <div className="admin-status-grid">
                      <article className="admin-status-card">
                        <span>API service</span>
                        <strong className="status-online">Online</strong>
                        <small>Connected to this dashboard</small>
                      </article>
                      <article className="admin-status-card">
                        <span>Licensed provider</span>
                        <strong>{adminOverview?.provider?.configured ? 'Configured' : 'Not configured'}</strong>
                        <small>{adminOverview?.provider?.name || 'Live markets and bet execution disabled'}</small>
                      </article>
                      <article className="admin-status-card">
                        <span>Operator accounts</span>
                        <strong>{adminOverview?.overview?.operatorCount ?? '—'}</strong>
                        <small>Active accounts in PostgreSQL</small>
                      </article>
                    </div>

                    <div className="admin-dashboard-grid">
                      <section className="admin-panel">
                        <div className="admin-panel-heading">
                          <h3>Integration readiness</h3>
                          <span>{adminOverview?.provider?.configured ? 'In progress' : 'Action required'}</span>
                        </div>
                        <ul className="readiness-list">
                          <li className="is-complete">Operator authentication enabled</li>
                          <li className={adminOverview?.provider?.configured ? 'is-complete' : ''}>Licensed provider connected</li>
                          <li>Live markets mapped to the exchange UI</li>
                          <li>Bet acceptance, settlement, and audit reconciliation</li>
                        </ul>
                        <p className="admin-safety-note">Displayed fixture odds are previews only. No real markets or wagers are available in this environment.</p>
                      </section>

                      <section className="admin-panel">
                        <div className="admin-panel-heading">
                          <h3>Recent operator activity</h3>
                          <span>Audit log</span>
                        </div>
                        {adminOverview?.overview?.recentActivity?.length ? (
                          <ul className="admin-audit-list">
                            {adminOverview.overview.recentActivity.map((entry, index) => (
                              <li key={`${entry.action}-${entry.createdAt}-${index}`}>
                                <strong>{entry.action}</strong>
                                <span>{entry.actor}</span>
                                <time>{new Date(entry.createdAt).toLocaleString()}</time>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="admin-empty-state">No operator activity has been recorded yet.</p>
                        )}
                      </section>
                    </div>
                    {adminUser.permissions?.includes('wallets:manage') && (
                      <section className="admin-panel wallet-admin-panel">
                        <div className="admin-panel-heading">
                          <h3>Manual wallet operations</h3>
                          <span>Ledger controlled</span>
                        </div>
                        <div className="admin-dashboard-grid">
                          <form className="admin-login-form" onSubmit={lookupWallet}>
                            <label>Customer ID<input value={walletCustomerId} onChange={(event) => setWalletCustomerId(event.target.value)} placeholder="provider customer id" required /></label>
                            <button className="login-button" type="submit">View balance</button>
                            {walletLookup && <p className="admin-bootstrap-help">Available: {walletLookup.available_minor} minor units · Held: {walletLookup.held_minor} · {walletLookup.currency}</p>}
                          </form>
                          <form className="admin-login-form" onSubmit={submitWalletRequest}>
                            <label>Operation<select value={walletAction} onChange={(event) => setWalletAction(event.target.value)}><option value="deposit">Deposit request</option><option value="withdrawal">Withdrawal request</option></select></label>
                            <label>Amount in INR<input inputMode="decimal" value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} placeholder="100.00" required /></label>
                            <label>Note<input value={walletNote} onChange={(event) => setWalletNote(event.target.value)} placeholder="Payment reference" /></label>
                            <button className="login-button" type="submit">Create request</button>
                          </form>
                        </div>
                        <div className="admin-payment-list">
                          <strong>Pending requests</strong>
                          {adminPayments.length ? adminPayments.map((payment) => (
                            <div className="admin-payment-row" key={payment.id}>
                              <span>{payment.direction} · {payment.customer_id} · {payment.amount_minor} {payment.currency}</span>
                              <span>
                                {payment.direction === 'deposit' && <button type="button" onClick={() => reviewPayment(payment.id, 'approve')}>Approve</button>}
                                <button type="button" onClick={() => reviewPayment(payment.id, 'reject')}>Reject</button>
                              </span>
                            </div>
                          )) : <p className="admin-empty-state">No pending manual payment requests.</p>}
                        </div>
                      </section>
                    )}
                    <p className="admin-permissions">Role permissions: {adminUser.permissions?.join(' · ') || 'dashboard:view'}</p>
                  </>
                )}
              </section>
            )}

            {activeView === 'Home' && !selectedGame && (
              <div className="home-page-content">
                <div className="home-main-content">
                  <section className="original-promo" aria-label="Casino promotion">
                    <img src="/original/slider-default-2025815182455745.jpg" alt="Universe Casino" />
                    <div className="original-promo-copy">
                      <img src="/original/theme-1709701978646-t10excha.png" alt="T10 Exchange" />
                      <div>
                        <strong>Universe Casino</strong>
                        <span>Live tables, original games and daily entertainment</span>
                      </div>
                      <button type="button" onClick={() => navigateTo('Casino')}>Explore casino</button>
                    </div>
                  </section>
                  <section className="home-highlights">
                    <div className="highlights-heading">
                      <h2>Highlights</h2>
                      <nav aria-label="Highlight sports">
                        {highlightSports.map((sport) => (
                          <button
                            className={highlightSport === sport ? 'selected' : ''}
                            key={sport}
                            type="button"
                            onClick={() => setHighlightSport(sport)}
                          >
                            {sport}
                          </button>
                        ))}
                      </nav>
                      <span className="snapshot-note">Saved odds · 7 Oct 2026</span>
                    </div>

                    <div className="market-table-scroll">
                      <table className="market-table">
                        <thead>
                          <tr>
                            <th scope="col">Event</th>
                            <th scope="col">Market</th>
                            <th scope="col">1</th>
                            <th scope="col">X</th>
                            <th scope="col">2</th>
                            <th scope="col">Multi</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="market-group-row">
                            <th colSpan="2" scope="rowgroup">Ball By Ball <span>In-Play</span></th>
                            <td colSpan="4">Match odds</td>
                          </tr>

                          {homeFixtures.map((match) => (
                            <tr key={match.id}>
                              <td className="fixture-name">
                                <strong>{match.teams}</strong>
                                <span>{match.live && <i aria-label="Live" />} {match.date}</span>
                              </td>
                              <td className="fixture-market">{match.market}</td>
                              {match.odds.map((option) => (
                                <td className="odds-cell" key={`${match.id}-${option.label}`}>
                                  <button
                                    type="button"
                                   disabled={!providerStatus?.provider?.configured}
                                   title={providerStatus?.provider?.configured ? `Add ${match.teams} ${option.label} to the bet slip` : 'Preview odds only'}
                                    aria-label={`${match.teams}, selection ${option.label}, odds ${option.price}`}
                                    onClick={() => addSlipSelection(match, option)}
                                  >
                                    <strong>{option.price}</strong>
                                    <span>{option.label}</span>
                                  </button>
                                </td>
                              ))}
                              <td className="multi-cell">
                                <button
                                  type="button"
                                  aria-label={`${pinnedMarkets.includes(match.id) ? 'Remove' : 'Add'} ${match.teams} ${pinnedMarkets.includes(match.id) ? 'from' : 'to'} Multi Markets`}
                                   onClick={() => setPinnedMarkets((current) => current.includes(match.id) ? current.filter((id) => id !== match.id) : [...current, match.id])}
                                >
                                   {pinnedMarkets.includes(match.id) ? '✓' : '+'}
                                </button>
                              </td>
                            </tr>
                          ))}

                          {homeFixtures.length === 0 && (
                            <tr><td className="no-market-results" colSpan="6">No matching events</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="home-casino-strip">
                    <div className="casino-tabs" aria-label="Casino categories">
                      {casinoCategories.map((category) => (
                        <button
                          className={casinoCategory === category ? 'selected' : ''}
                          key={category}
                          type="button"
                          aria-pressed={casinoCategory === category}
                          onClick={() => setCasinoCategory(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <div className="casino-main">
                      <div className="casino-game-grid">
                        {filteredGames.map((game) => (
                          <button key={game.name} type="button" aria-label={`Open ${game.name}`} onClick={() => navigateTo('Casino', game.route, game.name)}>
                            <img className="game-art" src={game.image} alt={game.name} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeView === 'In-Play' && (
              <section className="page-panel inplay-page">
                <div className="page-toolbar">
                  <div className="segmented-control" aria-label="Event timing">
                    {['In-Play', 'Today', 'Tomorrow'].map((tab) => (
                      <button
                        className={eventTab === tab ? 'selected' : ''}
                        key={tab}
                        type="button"
                        aria-pressed={eventTab === tab}
                        onClick={() => setEventTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <span className="result-count">{eventFixtures.length} events · saved snapshot</span>
                </div>
                <div className="empty-results">
                  <Timer aria-hidden="true" />
                  {eventFixtures.length ? (
                    <div className="event-preview-list">
                      {eventFixtures.map((match) => (
                           <button key={match.id} type="button" onClick={() => openEvent(match)}>
                          <strong>{match.teams}</strong>
                          <span>{match.date}</span>
                          <ChevronRight aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <><strong>No {eventTab.toLowerCase()} events</strong><span>Event data is not available in this offline copy.</span></>
                  )}
                </div>
              </section>
            )}

            {activeView === 'Multi Markets' && (
              <section className="multi-market-page page-panel">
                <div className="page-toolbar">
                  <h2>Multi Markets</h2>
                  <span className="result-count">{pinnedFixtures.length} selected</span>
                </div>
                {pinnedFixtures.length ? (
                  <div className="multi-market-list">
                    {pinnedFixtures.map((match) => (
                      <article key={match.id}>
                        <div><strong>{match.teams}</strong><span>{match.date} · {match.market}</span></div>
                        <button type="button" onClick={() => setPinnedMarkets((current) => current.filter((team) => team !== match.teams))}>Remove</button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-results">
                    <WalletCards aria-hidden="true" />
                    <strong>No markets added</strong>
                    <span>Choose “+” beside a match on Home to collect it here.</span>
                    <button className="login-button" type="button" onClick={() => navigateTo('Home')}>Browse Home</button>
                  </div>
                )}
              </section>
            )}

            {activeView === 'Sports' && (
              <section className="sports-page page-panel">
                <div className="sport-events">
                  <div className="page-toolbar">
                    <div>
                      <h2>{selectedSport === 'Vimaan' ? 'All Sports' : selectedSport}</h2>
                      <span className="result-count">{filteredSportFixtures.length} events</span>
                    </div>
                    <div className="competition-picker" aria-label="Competition filters">
                      <button className={!selectedCompetition ? 'selected' : ''} type="button" onClick={() => setSelectedCompetition(null)}>All</button>
                      {(sportCompetitions[selectedSport] || []).map((competition) => (
                        <button className={selectedCompetition === competition ? 'selected' : ''} key={competition} type="button" onClick={() => setSelectedCompetition(competition)}>{competition}</button>
                      ))}
                    </div>
                  </div>
                  {filteredSportFixtures.length ? (
                    <div className="event-preview-list">
                       {filteredSportFixtures.map((match) => (
                         <button key={match.id} type="button" onClick={() => openEvent(match)}>
                          <strong>{match.teams}</strong>
                          <span>{match.date}</span>
                          <ChevronRight aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-results">
                      <Trophy aria-hidden="true" />
                      <strong>No events to display</strong>
                      <span>The captured site does not include live market data for {selectedSport}.</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeView === 'Casino' && !selectedGame && (
              <section className="casino-page page-panel">
                <div className="casino-browser">
                  <div className="casino-tabs" aria-label="Casino categories">
                    {casinoCategories.map((category) => (
                      <button
                        className={casinoCategory === category ? 'selected' : ''}
                        key={category}
                        type="button"
                        aria-pressed={casinoCategory === category}
                        onClick={() => setCasinoCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div className="casino-main">
                    <div className="casino-game-grid">
                      {filteredGames.map((game) => (
                        <button className="casino-game-tile" key={game.name} type="button" aria-label={`Open ${game.name}`} onClick={() => navigateTo('Casino', game.route, game.name)}>
                          <img className="game-art" src={game.image} alt={game.name} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeView === 'Casino' && selectedGame && (
              <section className="game-offline page-panel">
                <button className="back-button" type="button" onClick={() => navigateTo('Casino')}>
                  <ArrowLeft aria-hidden="true" /> Casino games
                </button>
                <img src={selectedGameData?.image || '/original/vimaan1.webp'} alt={selectedGame} />
                <h2>{selectedGame}</h2>
                <p>This game needs the original online service to load.</p>
              </section>
            )}

            {activeView === 'Account' && (
              <section className="account-page page-panel">
                <aside className="account-menu" aria-label="Account pages">
                  <div className="account-menu-heading"><Menu aria-hidden="true" /> My Account</div>
                  {accountItems.map(({ label, Icon }) => (
                    <button
                      className={accountSection === label ? 'selected' : ''}
                      key={label}
                      type="button"
                      onClick={() => navigateAccountSection(label)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                      <ChevronRight aria-hidden="true" />
                    </button>
                  ))}
                </aside>

                <section className="account-detail">
                  <div className="page-toolbar">
                    <h2>{accountSection}</h2>
                    <span className={`account-status${user.isLoggedIn ? ' demo-status' : ''}`}><span /> {user.isLoggedIn ? (user.isDemo ? 'Demo account' : 'Provider account') : 'Offline'}</span>
                  </div>

                  {accountSection === 'Settings' ? (
                    <div className="account-empty">
                      <Settings aria-hidden="true" />
                      <strong>Account settings</strong>
                      <span>Sign in to view and update your preferences.</span>
                    </div>
                  ) : accountSection === 'My Profile' && user.isLoggedIn ? (
                    <div className="demo-profile">
                      <span className="demo-label">{user.isDemo ? 'DEMO ACCOUNT' : 'PROVIDER ACCOUNT'}</span>
                      <CircleUserRound aria-hidden="true" />
                      <h3>Welcome, {user.fullName}</h3>
                      <p>{user.isDemo ? 'This is a local demo account. Live betting remains disabled.' : 'Account data is supplied by the configured licensed provider.'}</p>
                      <div className="demo-balances">
                        <div><span>Available balance</span><strong>{wallet === null ? 'Unavailable' : wallet.toFixed(2)}</strong></div>
                        <div><span>Open bets</span><strong>{slip.length || 0}</strong></div>
                      </div>
                      <button className="login-button" type="button" onClick={signOut}>Sign out</button>
                    </div>
                  ) : accountSection === 'My Profile' ? (
                    <div className="account-empty">
                      <CircleUserRound aria-hidden="true" />
                      <strong>Sign in to view your profile</strong>
                      <span>Use the local demo account or sign in to the original service.</span>
                      <button className="login-button" type="button" onClick={() => navigateAccountSection('Login')}>
                        <LogIn aria-hidden="true" /> Login
                      </button>
                    </div>
                  ) : accountSection === 'Login' ? (
                    <form
                      className="login-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        signIn(loginUsername, loginPassword)
                      }}
                    >
                      <label>Username<input autoComplete="username" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} required /></label>
                      <label>Password<input autoComplete="current-password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label>
                       <button className="login-button" type="submit" disabled={!providerStatus?.provider?.configured && !(loginUsername.trim().toLowerCase() === 'demo' && loginPassword === 'demo1234')}><LogIn aria-hidden="true" /> Login</button>
                       <button className="demo-login-button" type="button" onClick={() => signIn('demo', 'demo1234')}>Login with Demo ID</button>
                      <p className="demo-credentials">Demo access works offline with <strong>demo</strong> / <strong>demo1234</strong>. Live provider access uses the fields above.</p>
                      {loginMessage && <p role="status">{loginMessage}</p>}
                    </form>
                  ) : accountSection === 'Bet History' && user.isLoggedIn ? (
                    <div className="history-list">
                      {betHistory.length ? betHistory.map((bet) => (
                        <article className="history-card" key={bet.id}>
                          <div>
                            <strong>{bet.event}</strong>
                            <span>{bet.market} · {bet.selection}</span>
                          </div>
                          <div className="history-metrics">
                            <span>Odds {bet.odds}</span>
                            <span>Stake {Number(bet.stake).toFixed(2)}</span>
                            <span className="status-pill">{bet.status}</span>
                          </div>
                        </article>
                      )) : <div className="account-empty"><FileText aria-hidden="true" /><strong>No recent bets</strong><span>Your bet history will appear here once you place a wager.</span></div>}
                    </div>
                  ) : (
                    <div className="account-empty">
                      <FileText aria-hidden="true" />
                      <strong>No {accountSection.toLowerCase()} records</strong>
                      <span>Sign in to view account data from the original service.</span>
                    </div>
                  )}
                </section>
              </section>
            )}
          </main>

          {(activeView === 'Home' || (activeView === 'Casino' && !selectedGame)) && (
            <footer className="site-footer">
              <nav className="footer-links" aria-label="Policies">
                {footerLinks.map((link, index) => (
                  <span className="footer-group" key={link}>
                    {index > 0 && <span className="footer-divider" aria-hidden="true">|</span>}
                    <a href={policyPaths[link]} onClick={(event) => { event.preventDefault(); navigateTo('Policy', policyPaths[link]) }}>{link}</a>
                  </span>
                ))}
                <span className="footer-group responsible-link">
                  <span className="footer-divider" aria-hidden="true">|</span>
                  <a href={policyPaths['Responsible Gambling']} onClick={(event) => { event.preventDefault(); navigateTo('Policy', policyPaths['Responsible Gambling']) }}>Responsible Gambling</a>
                </span>
              </nav>
            </footer>
          )}
        </div>

        <aside className="open-bets-sidebar" aria-label="Open bets" aria-live="polite">
          <div className="bet-slip-header">
            <h2>Open Bets</h2>
            <span>{slip.length} selections</span>
          </div>

          {slip.length ? (
            <div className="bet-slip-list">
              {slip.map((entry) => (
                <article className="bet-slip-item" key={entry.id}>
                  <div className="bet-primary">
                    <strong>{entry.matchName}</strong>
                    <span>{entry.market} · {entry.option}</span>
                  </div>
                  <div className="bet-meta">
                    <label>
                      Stake
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={entry.stake}
                        onChange={(event) => updateSlipStake(entry.id, event.target.value)}
                      />
                    </label>
                    <button type="button" aria-label={`Remove ${entry.matchName}`} onClick={() => removeSlipEntry(entry.id)}><X aria-hidden="true" /></button>
                  </div>
                  <div className="bet-odds">Odds {entry.price}</div>
                </article>
              ))}

              <div className="bet-slip-summary">
                <div><span>Total stake</span><strong>{totalStake.toFixed(2)}</strong></div>
                <div><span>Potential return</span><strong>{totalPotentialReturn.toFixed(2)}</strong></div>
              </div>

                <button className="place-bet-button" type="button" disabled={!providerStatus?.provider?.configured || !user.isLoggedIn || user.isDemo} onClick={placeBets} title={!user.isLoggedIn ? 'Sign in before placing a bet' : user.isDemo ? 'Demo accounts cannot place bets' : undefined}>
                {!providerStatus?.provider?.configured ? 'Provider integration required' : user.isDemo ? 'Demo betting disabled' : !user.isLoggedIn ? 'Sign in to place bet' : 'Place bets'}
              </button>
            </div>
          ) : (
            <div className="bet-empty-state">
              <WalletCards aria-hidden="true" />
              <p>Your open bets will appear here.</p>
            </div>
          )}
        </aside>
      </div>
      <div className="contact-dock" aria-label="Contact options">
        <a href="#contact-whatsapp" aria-label="WhatsApp support"><img src="/original/whatsapplogo.png" alt="" /></a>
        <a href="#contact-telegram" aria-label="Telegram support"><img src="/original/telegram.png" alt="" /></a>
      </div>
      {!ageConfirmed && (
        <div className="age-gate-backdrop" role="presentation">
          <section className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
            <h2 id="age-gate-title">18+ confirmation</h2>
            <p>Underage gambling is prohibited. This confirmation is not identity or age verification. If you are connecting from a non-gambling territory, you are responsible for ensuring that your use of this service is lawful.</p>
            <p>Please confirm that you are 18 years old or above to view this development copy.</p>
            <div className="age-gate-actions">
              <button className="login-button" type="button" onClick={confirmAge}>Confirm</button>
              <button className="secondary-button" type="button" onClick={() => window.location.assign('about:blank')}>Exit</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
