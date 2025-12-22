"use client";

import { BasicLayout } from "@/components/globals/basic_layout";
import "@fortawesome/fontawesome-free/css/all.css";
import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";
import { resolveUrl } from "../components/globals/url/resolveUrl";

interface FeatureCardProps {
  image: string;
  title: string;
  description: string;
}
const initialFeatures: FeatureCardProps[] = [
  {
    image: "/images/analyze1.png",
    title: "Analyze your dives",
    description:
      "Gain insights into your dives with detailed stats and charts. Simply upload your dive logs and instantly get an overview of your dive.",
  },
  {
    image: "/images/group.jpg",
    title: "Share your dives",
    description:
      "Share your dives with friends and diving groups. Wether it is planning your next trip or just showing off your favorite dives, this app overs easy and secure sharing of your logs.",
  },
  {
    image: "/images/merge.png",
    title: "Combine profiles",
    description:
      "Merge diving profiles to create a single continuous dive. No more looking through loads of profiles. Just combine them and enjoy a clean overview of your full dives ",
  },
];

const FeatureCard: React.FC<FeatureCardProps> = ({
  image,
  title,
  description,
}) => {
  return (
    <div className="w-full sm:min-w-75 sm:max-w-87.5 md:min-w-100 md:max-w-105 bg-white rounded-xl shadow-lg p-6 sm:p-8 shrink-0">
      <div className="w-full h-40 sm:h-44 md:h-48 overflow-hidden rounded-md mb-4">
        <Image src={image} alt={title} className="w-full h-full object-cover" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-gray-600">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const [features, setFeatures] = useState<FeatureCardProps[]>(initialFeatures);

  useEffect(() => {
    (async () => {
      const [diveCountData, userCountData] = await Promise.all([
        axios.get(resolveUrl("/v1/explore/count/dives")),
        axios.get(resolveUrl("/v1/explore/count/users")),
      ]);
      const diveCount = diveCountData.data as number;
      const userCount = userCountData.data as number;
      const newFeature: FeatureCardProps = {
        title: "Statistics",
        description: `There are ${userCount} users signed up, having logged ${diveCount} dives.`,
        image: "/images/stats.jpeg",
      };
      setFeatures((features) => {
        const newFeatures = [...features];
        if (features.length >= initialFeatures.length) {
          newFeatures[initialFeatures.length] = newFeature;
        } else {
          newFeatures.push(newFeature);
        }
        return newFeatures;
      });
    })();
  }, []);

  return (
    <BasicLayout page_name="" requiresAuth={false}>
      <div
        className="bg-gray-100  bg-[url('/images/background.jpg')]
          bg-cover bg-center bg-fixed min-h-full
        "
      >
        <main className="flex-1 relative p-6 md:p-10">
          <h2 className="text-3xl text-white font-bold text-center mb-8">
            Discover What You Can Do
          </h2>

          <div className="flex flex-wrap gap-6 justify-center pb-4">
            {features.map((feature, index) => (
              <FeatureCard key={index + "-feature-card"} {...feature} />
            ))}
          </div>
        </main>
      </div>
    </BasicLayout>
  );
};
export default LandingPage;
