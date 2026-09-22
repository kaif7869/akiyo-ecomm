import Image from "next/image";

type ProductMockupProps = {
  image: string;
  title: string;
};

export function ProductMockup({ image, title }: ProductMockupProps) {
  return (
    <div className="product-mockup">
      <Image
        alt=""
        className="mockup-background"
        fill
        sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 20vw"
        src={image}
      />
      <div className="device-row" aria-hidden="true">
        <div className="phone-device">
          <Image alt="" fill sizes="64px" src={image} />
        </div>
        <div className="laptop-device">
          <div className="laptop-notch" />
          <Image alt="" fill sizes="210px" src={image} />
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
