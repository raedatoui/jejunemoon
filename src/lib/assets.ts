const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL ?? '').replace(/\/+$/, '');

export function assetUrl(path: string) {
    return `${CDN_URL}${path}`;
}
