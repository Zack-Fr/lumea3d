import React from 'react';
import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Zap } from "lucide-react";
import { AssetItem } from '../../types/projectEditor';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface AssetCardProps {
  asset: AssetItem;
  categoryIcon: React.ComponentType<any>;
  isSelected: boolean;
  onSelect: (assetId: number) => void;
  onAdd: (assetName: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = React.memo(({ 
  asset, 
  categoryIcon: Icon, 
//   isSelected, 
  onSelect, 
  onAdd 
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={styles.assetCard}
        onClick={() => onSelect(asset.id)}
      >
        <CardContent className={styles.assetContent}>
          <div className={styles.assetHeader}>
            <div className={styles.assetInfo}>
              <div className={styles.assetNameRow}>
                <Icon className={styles.assetIcon} />
                <p className={styles.assetName}>{asset.name}</p>
                {asset.rarity && (
                  <Badge 
                    className={`${styles.assetRarityBadge} ${styles[`rarity-${asset.rarity}`]}`}
                  >
                    {asset.rarity}
                  </Badge>
                )}
              </div>
              <p className={styles.assetCategory}>{asset.category || asset.type}</p>
              {asset.xp && (
                <div className={styles.assetXp}>
                  <Zap className="w-3 h-3 text-glass-yellow" />
                  <span className={styles.assetXpText}>+{asset.xp} XP</span>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              className={styles.assetAddButton}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(asset.name);
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

AssetCard.displayName = 'AssetCard';

export default AssetCard;