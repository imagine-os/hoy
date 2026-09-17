import './Avatar.css';

export function Avatar({ name, initials, src, size = 36 }: { name: string; initials?: string; src?: string | null; size?: number }) {
  const ini = initials ?? name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, ['--avatar-hue' as string]: hue }} role="img" aria-label={name} title={name}>
      {src ? <img src={src} alt="" /> : ini}
    </span>
  );
}
