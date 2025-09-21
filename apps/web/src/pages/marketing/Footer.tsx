export default function Footer(){
  return (
    <footer className="py-12 text-center text-sm text-brand-stone">
      <img src="/brand/logo.svg" alt="Lumea" className="h-8 mx-auto mb-3"/>
      © {new Date().getFullYear()} Lumea — All rights reserved.
    </footer>
  )
}