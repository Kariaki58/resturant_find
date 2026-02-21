import { Info, Clock, MapPin, Search, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from 'next/link';

export default function RestaurantMenuPage({ params }: { params: { slug: string } }) {
  // Mock data for the store
  const restaurant = {
    name: "Mama Put HQ",
    slug: params.slug,
    rating: 4.8,
    reviews: 124,
    categories: ["Popular", "Swallow", "Soups", "Rice Dishes", "Drinks"],
    menu: [
      { id: 1, name: "Jollof Rice Special", price: 3500, desc: "Smokey party jollof served with plantain and chicken.", img: "https://picsum.photos/seed/jollof/400/300" },
      { id: 2, name: "Pounded Yam & Egusi", price: 4000, desc: "Smooth pounded yam with rich melon soup and assorted meat.", img: "https://picsum.photos/seed/egusi/400/300" },
      { id: 3, name: "Beef Suya (Full Stick)", price: 1500, desc: "Traditional Hausa spicy grilled beef with onions and yaji.", img: "https://picsum.photos/seed/suya/400/300" },
      { id: 4, name: "Chapman", price: 1200, desc: "The ultimate Nigerian mocktail. Refreshing and fruity.", img: "https://picsum.photos/seed/chapman/400/300" },
    ]
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Header */}
      <div className="h-64 relative overflow-hidden">
        <img 
          src="https://picsum.photos/seed/rest/1200/400" 
          alt="Restaurant Cover" 
          className="w-full h-full object-cover"
          data-ai-hint="restaurant food banner"
        />
        <div className="absolute inset-0 bg-black/40" />
        <Link href="/" className="absolute top-6 left-6 text-white font-bold flex items-center gap-1 tracking-tighter text-xl">
          resturant<span className="text-primary">me</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto w-full -mt-20 relative z-10 px-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl border mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold font-headline">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><span className="text-primary font-bold">★</span> {restaurant.rating} ({restaurant.reviews} reviews)</span>
                <span className="flex items-center gap-1 font-medium"><Clock size={14} /> 20-30 mins</span>
                <span className="flex items-center gap-1 font-medium"><MapPin size={14} /> Victoria Island, Lagos</span>
              </div>
            </div>
            <Button variant="outline" size="icon" className="rounded-full">
              <Info size={20} />
            </Button>
          </div>
        </div>

        {/* Menu Search & Filter */}
        <div className="sticky top-4 z-30 bg-white/80 backdrop-blur-md p-2 rounded-full border shadow-sm flex items-center gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input className="border-none bg-transparent pl-10 focus-visible:ring-0 shadow-none text-base" placeholder="Search menu..." />
          </div>
          <Button className="rounded-full px-6 bg-primary">Order Now</Button>
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide no-scrollbar">
          {restaurant.categories.map((cat, i) => (
            <Badge key={i} variant={i === 0 ? "default" : "secondary"} className="px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap cursor-pointer hover:bg-primary hover:text-white transition-colors">
              {cat}
            </Badge>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-24">
          {restaurant.menu.map((item) => (
            <div key={item.id} className="group p-4 rounded-2xl border bg-white hover:shadow-lg hover:border-primary/20 transition-all flex gap-4 cursor-pointer">
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.desc}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-bold">₦{item.price.toLocaleString()}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border">
                <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      <div className="fixed bottom-8 inset-x-0 px-4 z-50 pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
          <Button size="lg" className="w-full rounded-full h-16 shadow-2xl bg-primary hover:bg-primary/90 text-lg font-bold group" asChild>
            <Link href={`/menu/${params.slug}/checkout`}>
              <ShoppingBag className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
              View Cart (2 items) • ₦7,500
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShoppingBag(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
