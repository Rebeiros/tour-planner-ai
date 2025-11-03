import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Compass, Hotel, Train, Car, Bus, Plane, Search, Star, Users, Globe, LogIn, UserPlus, ChevronRight, Home, Layers, Loader2, CreditCard, Crown, DollarSign } from "lucide-react";
import { GoTrueClient } from "@supabase/gotrue-js";

/*************************************
 * Tour Planner AI — Netlify-ready (Realtime v1)
 * -------------------------------------------------
 * - Removed mock providers
 * - Netlify Identity (auth)
 * - Netlify Functions: /geo, /attractions, /hotels
 * - Client geocoding with Nominatim for city→lat/lon
 * - Step order: Dates→Trip Type→Destination→Nearby→Stays→Transport→Itinerary
 *************************************/

/********** Minimal UI Primitives **********/
const Button = ({ className = "", variant = "default", children, ...props }) => (
  <button
    className={
      `rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition ${
        variant === "outline"
          ? "border border-gray-300 bg-white hover:bg-gray-50"
          : variant === "ghost"
          ? "hover:bg-gray-100"
          : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-black text-white hover:opacity-90"} ${className}`
    }
    {...props }
  >
    {children}
  </button>
);
const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
);
const Field = ({ label, children, hint }) => (
  <label className="block space-y-2">
    <div className="text-sm font-medium text-gray-700">{label}</div>
    {children}
    {hint && <div className="text-xs text-gray-500">{hint}</div>}
  </label>
);
const Input = (props) => (
  <input {...props} className={`w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black ${props.className||""}`} />
);
const Select = ({ options = [], value, onChange, placeholder }) => (
  <select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black">
    <option value="" disabled>{placeholder||"Select"}</option>
    {options.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

/********** Monetization helpers (placeholders for real partners) **********/
const AdSlot = ({ label = "Sponsored" }) => (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
    <b>{label}:</b> Partner placement (hotel / flight / insurance). Replace with real affiliate widgets.
  </div>
);

const AffiliateButton = ({ partner, href = "#" }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100">
    <DollarSign size={14}/> Book via {partner}
  </a>
);

const ProBadge = () => (
  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"><Crown size={10}/> Pro</span>
);

/********** Utilities **********/
async function geocodeCity(city){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
  const d = await r.json();
  if(d && d[0]) return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
  return null;
}

/********** Main App **********/
export default function App(){
  // Auth: Netlify Identity
  
const auth = new GoTrueClient({
  url: `${window.location.origin}/.netlify/identity`,
  fetch: fetch
});
  const [mode, setMode] = useState("auth");
  const [user, setUser] = useState(null);
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPro, setShowPro] = useState(false);

  // wizard state
  const [step, setStep] = useState(1); // 1..7
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [party, setParty] = useState(""); // solo | couple | family | group
  const [tourType, setTourType] = useState(""); // national | international

  const [homeCountrySelection, setHomeCountrySelection] = useState("");
  const [mainCity, setMainCity] = useState("");
  const [mainCityPos, setMainCityPos] = useState(null); // {lat,lon}
  const [multiSpot, setMultiSpot] = useState(false);
  const [nearby, setNearby] = useState([]); // fetched items
  const [selectedSpots, setSelectedSpots] = useState([]);

  const [budgetTier, setBudgetTier] = useState(""); // low | mid | high
  const [intlPick, setIntlPick] = useState(""); // free-text city for now

  const [transport, setTransport] = useState(""); // own | rental | taxi | public | flight

  const progress = useMemo(()=> Math.round((step/7)*100), [step]);

  // Load Identity session (if any)
  useEffect(()=>{
    try {
      const current = auth.currentUser();
      if(current){ setUser({ id: current.id, email: current.email, isPro: false }); setMode("wizard"); }
    } catch {}
  }, [auth]);

  // Geo from serverless
  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/.netlify/functions/geo");
      const g = await r.json();
      setGeo(g); // {country, code}
      if(!homeCountrySelection && g?.code) setHomeCountrySelection(g.code);
    }catch{}
  })(); }, []);

  // Fetch attractions when mainCity changes
  useEffect(()=>{ (async()=>{
    if(!mainCity) return;
    const pos = await geocodeCity(mainCity);
    setMainCityPos(pos);
    if(pos){
      const r = await fetch(`/.netlify/functions/attractions?lat=${pos.lat}&lon=${pos.lon}&radius=30000&limit=20`);
      const data = await r.json();
      setNearby(data.items || []);
    } else {
      setNearby([]);
    }
  })(); }, [mainCity]);

  // Hotels fetch (simple city-based stub endpoint for now)
  const [hotels, setHotels] = useState([]);
  useEffect(()=>{ (async()=>{
    const city = tourType === "national" ? mainCity : intlPick;
    if(!city) { setHotels([]); return; }
    try{
      const r = await fetch(`/.netlify/functions/hotels?city=${encodeURIComponent(city)}`);
      const d = await r.json();
      setHotels(d.hotels || []);
    }catch{ setHotels([]); }
  })(); }, [tourType, mainCity, intlPick]);

  // auth handlers
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const doLogin = async () => { setLoading(true); try{ const u = await auth.login(email, password); setUser({ id:u.id, email:u.email, isPro:false }); setMode("wizard"); setStep(1);} finally{ setLoading(false);} };
  const doSignup = async () => { setLoading(true); try{ const u = await auth.signup(email, password); setUser({ id:u.id, email:u.email, isPro:false }); setMode("wizard"); setStep(1);} finally{ setLoading(false);} };
  const doLogout = async () => { try{ const u = auth.currentUser(); if(u) await u.logout(); } catch{} finally{ setUser(null); setMode("auth"); } };

  // nav gating
  const canNext = () => {
    switch(step){
      case 1: return duration && startDate && endDate && party;                                // Dates & travellers
      case 2: return tourType && (tourType === "national" ? homeCountrySelection : budgetTier);// Trip type (+budget for intl)
      case 3: return tourType === "national" ? !!mainCity : !!intlPick;                        // Destination chosen
      case 4: return true;                                                                      // Nearby optional
      case 5: return true;                                                                      // Stays optional (booking later)
      case 6: return !!transport;                                                               // Transport required
      case 7: return true;                                                                      // Summary
      default: return false;
    }
  };
  const next = ()=> setStep((s)=> Math.min(7, s+1));
  const back = ()=> setStep((s)=> Math.max(1, s-1));

  const addSpot = (s) => setSelectedSpots(prev => prev.find(x=>x.id===s.id)? prev : [...prev, s]);
  const removeSpot = (id) => setSelectedSpots(prev => prev.filter(x=>x.id!==id));

  // export/paywall (Stripe later)
  const handleExport = ()=>{ if(user?.isPro){ alert("Exporting PDF (placeholder)"); } else { setShowPro(true); } };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Compass size={18}/></div>
            <div>
              <div className="text-xl font-bold">Tour Planner AI</div>
              <div className="text-xs text-gray-500">Plan smarter. Travel happier.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-sm text-gray-600">Hi, <b>{user.email}</b>{user.isPro && <ProBadge/>}</div>
                <Button variant="outline" onClick={doLogout}>Logout</Button>
              </>
            ) : (
              <Button onClick={()=>setMode("auth")}><LogIn className="mr-2 inline" size={16}/>Login</Button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {mode === "auth" && (
            <Step key="auth">
              <Card className="p-8">
                <SectionTitle icon={Home} title="Welcome" subtitle="Sign in or create an account to start planning." />
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Card>
                    <div className="mb-4 flex items-center gap-2 text-gray-800"><LogIn size={18}/> Existing user</div>
                    <Field label="Email"><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></Field>
                    <div className="mt-3"/>
                    <Field label="Password"><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••"/></Field>
                    <div className="mt-4 flex gap-3">
                      <Button onClick={doLogin} disabled={loading}>{loading ? <Loader2 className="mr-2 inline animate-spin" size={16}/> : <LogIn className="mr-2 inline" size={16}/>} Login</Button>
                      <Button variant="outline" onClick={doSignup} disabled={loading}>{loading ? <Loader2 className="mr-2 inline animate-spin" size={16}/> : <UserPlus className="mr-2 inline" size={16}/>} Sign up</Button>
                    </div>
                  </Card>

                  <div className="space-y-4 self-center text-sm text-gray-600">
                    <div className="flex items-start gap-3"><div className="mt-1 rounded-lg bg-black px-2 py-1 text-xs text-white">LIVE</div><div>Realtime data via serverless functions. Keys stay safe.</div></div>
                    <div className="flex items-start gap-3"><div className="mt-1 rounded-lg bg-black px-2 py-1 text-xs text-white">PRO</div><div>Export PDF, remove ads, partner discounts.</div></div>
                    <AdSlot />
                  </div>
                </div>
              </Card>
            </Step>
          )}

          {mode === "wizard" && (
            <Step key="wizard">
              {/* Stepper + progress */}
              <Card className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Step {step} of 7</div>
                  <div className="w-64 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-black" style={{width:`${progress}%`}}/></div>
                </div>
              </Card>

              {/* Step 1: Dates & travellers */}
              {step === 1 && (
                <Card>
                  <SectionTitle icon={Calendar} title="Dates & Group" subtitle="Set fundamentals for planning" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-4">
                    <Field label="Duration (days)"><Input type="number" min={1} value={duration} onChange={(e)=>setDuration(e.target.value)} placeholder="5"/></Field>
                    <Field label="Start date"><Input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)}/></Field>
                    <Field label="End date"><Input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)}/></Field>
                    <Field label="Travellers">
                      <Select value={party} onChange={setParty} options={[{value:"solo",label:"Solo"},{value:"couple",label:"Couple"},{value:"family",label:"Family"},{value:"group",label:"Group"}]} placeholder="Select"/>
                    </Field>
                  </div>
                  <NavBar backDisabled onBack={()=>{}} onNext={next} canNext={canNext()} />
                </Card>
              )}

              {/* Step 2: Trip Type */}
              {step === 2 && (
                <Card>
                  <SectionTitle icon={Globe} title="Trip Type" subtitle="National vs International" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Choose">
                      <Select value={tourType} onChange={setTourType} options={[{value:"national",label:"National"},{value:"international",label:"International"}]} placeholder="Select trip type" />
                    </Field>
                    {tourType === "national" && (
                      <Field label="Your country">
                        <Select value={homeCountrySelection} onChange={setHomeCountrySelection} options={[{value:geo?.code||"",label:geo?`${geo.country}`:"Detected country"}]} placeholder={geo?`Detected: ${geo.country}`:"Select country"} />
                      </Field>
                    )}
                    {tourType === "international" && (
                      <Field label="Budget">
                        <Select value={budgetTier} onChange={setBudgetTier} options={[{value:"low",label:"Budget"},{value:"mid",label:"Mid"},{value:"high",label:"Premium"}]} placeholder="Select budget" />
                      </Field>
                    )}
                  </div>
                  <AdSlot label="Sponsored: Travel Insurance" />
                  <NavBar onBack={back} onNext={next} canNext={canNext()} />
                </Card>
              )}

              {/* Step 3: Destination Picker */}
              {step === 3 && (
                <Card>
                  <SectionTitle icon={MapPin} title="Destination" subtitle={tourType==="national"?"Type your main city and press Enter":"Type your main international city and press Enter"} />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label={tourType === "national" ? "Main city (national)" : "Main city (international)"}>
  			<div className="relative">
    			<Search className="pointer-events-none absolute left-3 top-2.5" size={16} />
    			<Input
      			placeholder="e.g., New York / Paris"
      				className="pl-9"
      				value={tourType === "national" ? mainCity : intlPick}
      				onChange={(e) =>
        			tourType === "national"
          			? setMainCity(e.target.value)
          			: setIntlPick(e.target.value)
      				}
      				onKeyDown={(e) => {
        			if (e.key === "Enter") {
          			// Geocoding runs via useEffect when the city string changes
        			}
      			}}
    			/>
  			</div>
			</Field>
                    <Field label="Multi main spot?">
                      <Select value={multiSpot?"yes":"no"} onChange={(v)=>setMultiSpot(v==="yes")} options={[{value:"no",label:"No"},{value:"yes",label:"Yes"}]} placeholder="Select"/>
                    </Field>
                  </div>
                  <NavBar onBack={back} onNext={next} canNext={canNext()} />
                </Card>
              )}

              {/* Step 4: Nearby & Add-ons (from /attractions) */}
              {step === 4 && (
                <Card>
                  <SectionTitle icon={Layers} title="Nearby & Add-ons" subtitle="Add interesting places around your main city" />
                  {nearby?.length>0 ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {nearby.map(n=> (
                        <div key={n.id} className="flex items-start justify-between rounded-xl border p-3">
                          <div>
                            <div className="font-medium">{n.name || "Untitled"}</div>
                            <div className="text-xs text-gray-500">{n.kinds}</div>
                          </div>
                          <Button variant={selectedSpots.find(x=>x.id===n.id)?"outline":"default"} onClick={()=> selectedSpots.find(x=>x.id===n.id)? removeSpot(n.id) : addSpot(n) }>
                            {selectedSpots.find(x=>x.id===n.id)? "Remove" : "Add"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">Type a city in the previous step and press Enter to fetch nearby attractions.</div>
                  )}
                  <NavBar onBack={back} onNext={next} canNext={canNext()} />
                </Card>
              )}

              {/* Step 5: Stays & Food (from /hotels) */}
              {step === 5 && (
                <Card>
                  <SectionTitle icon={Hotel} title="Stays & Food" subtitle="Top-rated options (provider integration next)" />
                  {hotels?.length>0 ? (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {hotels.map(h=> (
                        <div key={h.name} className="rounded-xl border border-gray-200 p-4">
                          <div className="font-medium">{h.name}</div>
                          {h.rating && <div className="text-xs text-yellow-700">★ {h.rating}</div>}
                          <div className="mt-1 text-sm text-gray-600">{h.blurb}</div>
                          <div className="mt-3"><AffiliateButton partner="Booking"/></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-2">Add a city to see hotels. Provider integration coming soon.</div>
                  )}
                  <AdSlot label="Sponsored: Hotels & Restaurants" />
                  <NavBar onBack={back} onNext={next} canNext={canNext()} />
                </Card>
              )}

              {/* Step 6: Transport */}
              {step === 6 && (
                <Card>
                  <SectionTitle icon={Train} title="Transport" subtitle="How will you get around?" />
                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    <TransportTile icon={Car} label="Own" value="own" selected={transport} onSelect={setTransport} />
                    <TransportTile icon={Car} label="Rental" value="rental" selected={transport} onSelect={setTransport} />
                    <TransportTile icon={Bus} label="Taxi" value="taxi" selected={transport} onSelect={setTransport} />
                    <TransportTile icon={Bus} label="Public" value="public" selected={transport} onSelect={setTransport} />
                    <TransportTile icon={Plane} label="Flight" value="flight" selected={transport} onSelect={setTransport} />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <AffiliateButton partner={transport==="rental"?"Hertz":"Rome2Rio"} />
                    <AdSlot label="Sponsored: Car Rentals & Transit" />
                  </div>
                  <NavBar onBack={back} onNext={next} canNext={canNext()} />
                </Card>
              )}

              {/* Step 7: Summary */}
              {step === 7 && (
                <Card className="p-8">
                  <SectionTitle icon={Compass} title="AI‑drafted itinerary" subtitle="Editable outline – live data wired" right={<Button onClick={handleExport}>Export PDF <ProBadge/></Button>} />
                  <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-5">
                      <ItineraryBlock
                        duration={duration}
                        startDate={startDate}
                        endDate={endDate}
                        tourType={tourType}
                        mainSpot={(tourType==="national"?mainCity:intlPick) || "Custom"}
                        nearby={selectedSpots}
                        transport={transport}
                      />
                    </div>
                    <div className="space-y-4">
                      <Card>
                        <div className="text-sm text-gray-500">Next integrations</div>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-700">
                          <li>Booking/Expedia affiliate API</li>
                          <li>Flights: Skyscanner/Amadeus</li>
                          <li>Activities: GetYourGuide</li>
                          <li>Stripe for Pro subscriptions</li>
                        </ul>
                      </Card>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={()=> setStep(6)}>Back</Button>
                        <Button onClick={()=> alert("Share link (placeholder)")}>Share</Button>
                      </div>
                      <AdSlot label="Sponsored: Activity Tickets" />
                    </div>
                  </div>
                </Card>
              )}
            </Step>
          )}
        </AnimatePresence>

        <footer className="mt-10 flex items-center justify-between border-t pt-6 text-xs text-gray-500">
          <div>© {new Date().getFullYear()} Tour Planner AI • Realtime MVP</div>
          <div>Netlify Functions • Identity • Geocoding</div>
        </footer>
      </div>

      {showPro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setShowPro(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><Crown size={18}/> Go Pro</div>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
              <li>Unlimited itineraries</li>
              <li>PDF export & offline access</li>
              <li>No ads + partner discounts</li>
            </ul>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">₹/£/€ 3 per plan or 5/month</div>
              <Button onClick={()=>{ if(user) setUser({ ...user, isPro:true }); setShowPro(false); }}><CreditCard size={16} className="mr-2"/>Mock Subscribe</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/********** Small Components **********/
function NavBar({ backDisabled=false, onBack, onNext, canNext }){
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="outline" onClick={onBack} disabled={backDisabled}>Back</Button>
      <Button onClick={onNext} disabled={!canNext}>Next <ChevronRight size={16} className="ml-1"/></Button>
    </div>
  );
}

function TransportTile({ icon:Icon, label, value, selected, onSelect }){
  const active = selected===value;
  return (
    <button onClick={()=>onSelect(value)} className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition hover:shadow ${active?"border-black bg-black text-white":"border-gray-200"}`}>
      <Icon size={16}/><span>{label}</span>
    </button>
  );
}

function ItineraryBlock({ duration, startDate, endDate, tourType, mainSpot, nearby, transport }){
  const days = Math.max(1, parseInt(duration||"1",10));
  const plan = Array.from({ length: days }).map((_,i)=>({
    day: i+1,
    focus: i===0? mainSpot : ((nearby[i-1]?.name) || "Flexible / Explore"),
    notes: i===0? `Arrive, settle in, explore ${mainSpot}.` : `Visit ${(nearby[i-1]?.name) || "local highlights"}.`,
  }));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
        <div><b>Dates:</b> {startDate || "TBA"} → {endDate || "TBA"} • <b>Duration:</b> {duration} days</div>
        <div><b>Type:</b> {tourType} • <b>Main:</b> {mainSpot} • <b>Transport:</b> {transport || "TBD"}</div>
      </div>
      {plan.map(({day,focus,notes})=> (
        <Card key={day}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Day {day}: {focus}</div>
            <div className="text-xs text-gray-500">Editable later</div>
          </div>
          <div className="mt-2 text-sm text-gray-700">{notes}</div>
        </Card>
      ))}
    </div>
  );
}
